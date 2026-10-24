package care.oath.pharmacy.document;

import care.oath.pharmacy.config.AppProperties;
import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.security.CurrentUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentService {
    private static final List<String> TYPES = List.of("FDA_LICENSE", "BUSINESS_PERMIT", "PHARMACIST_PRC_ID");
    private final JdbcClient jdbc;
    private final MembershipService memberships;
    private final AppProperties properties;
    private final ObjectMapper mapper;
    private final RestClient rest;

    public DocumentService(JdbcClient jdbc, MembershipService memberships, AppProperties properties, ObjectMapper mapper, RestClient.Builder builder) {
        this.jdbc = jdbc; this.memberships = memberships; this.properties = properties; this.mapper = mapper; this.rest = builder.build();
    }

    public List<DocumentView> list(CurrentUser user) {
        var membership = memberships.requireMembership(user, false);
        memberships.requireManager(membership);
        var pharmacy = membership.pharmacyId();
        return jdbc.sql("""
                select id,document_type::text,original_filename,status::text,created_at,expires_at,reviewer_message,quality_warnings,ocr_fields
                from public.pharmacy_documents where pharmacy_id=:pharmacy order by created_at desc
                """).param("pharmacy", pharmacy).query((rs, row) -> new DocumentView(rs.getObject("id", UUID.class), rs.getString("document_type"),
                        label(rs.getString("document_type")), rs.getString("original_filename"), publicStatus(rs.getString("status")),
                        rs.getTimestamp("created_at").toInstant(), rs.getDate("expires_at") == null ? null : rs.getDate("expires_at").toLocalDate().toString(),
                        rs.getString("reviewer_message"), readList(rs.getString("quality_warnings")), readMap(rs.getString("ocr_fields")))).list();
    }

    @Transactional
    public DocumentView upload(CurrentUser user, String type, MultipartFile file) {
        if (!TYPES.contains(type)) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOCUMENT_TYPE", "Unsupported verification document type.");
        validate(file);
        var membership = memberships.requireMembership(user, false);
        memberships.requireManager(membership);
        var filename = safeFilename(file.getOriginalFilename());
        var path = user.id() + "/" + membership.pharmacyId() + "/" + UUID.randomUUID() + "-" + filename;
        byte[] bytes;
        try { bytes = file.getBytes(); }
        catch (Exception error) { throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_READ_FAILED", "The selected file could not be read."); }
        storeObject(user, path, file.getContentType(), bytes);
        var applicationId = jdbc.sql("select id from public.pharmacy_applications where pharmacy_id=:p").param("p", membership.pharmacyId()).query(UUID.class).optional().orElse(null);
        var id = jdbc.sql("""
                insert into public.pharmacy_documents(pharmacy_id,application_id,uploaded_by,document_type,storage_path,original_filename,mime_type,size_bytes)
                values (:p,:a,:u,cast(:type as public.document_type),:path,:name,:mime,:size) returning id
                """).param("p", membership.pharmacyId()).param("a", applicationId).param("u", user.id()).param("type", type)
                .param("path", path).param("name", filename).param("mime", file.getContentType()).param("size", file.getSize()).query(UUID.class).single();
        runOcr(id, file.getContentType(), filename, bytes);
        return list(user).stream().filter(item -> item.id().equals(id)).findFirst().orElseThrow();
    }

    public SignedUrl signedUrl(CurrentUser user, UUID id) {
        var membership = memberships.requireMembership(user, false);
        memberships.requireManager(membership);
        var pharmacy = membership.pharmacyId();
        var path = jdbc.sql("select storage_path from public.pharmacy_documents where id=:id and pharmacy_id=:p")
                .param("id", id).param("p", pharmacy).query(String.class).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND", "Document not found."));
        try {
            var response = rest.post().uri(properties.supabaseUrl() + "/storage/v1/object/sign/pharmacy-documents/" + encodePath(path))
                    .header("apikey", properties.supabasePublishableKey()).header("Authorization", "Bearer " + user.accessToken())
                    .contentType(MediaType.APPLICATION_JSON).body(Map.of("expiresIn", 60)).retrieve().body(JsonNode.class);
            var signed = response == null ? null : response.path("signedURL").asText(null);
            if (signed == null) throw new RestClientException("Missing signed URL");
            return new SignedUrl(properties.supabaseUrl() + "/storage/v1" + signed, Instant.now().plusSeconds(60));
        } catch (RestClientException error) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "STORAGE_UNAVAILABLE", "A secure preview link could not be created.");
        }
    }

    private void storeObject(CurrentUser user, String path, String mime, byte[] bytes) {
        if (properties.supabasePublishableKey() == null || properties.supabasePublishableKey().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_NOT_CONFIGURED", "Document storage is not configured on the backend.");
        }
        try {
            rest.post().uri(properties.supabaseUrl() + "/storage/v1/object/pharmacy-documents/" + encodePath(path))
                    .header("apikey", properties.supabasePublishableKey()).header("Authorization", "Bearer " + user.accessToken())
                    .header("x-upsert", "false").contentType(MediaType.parseMediaType(mime)).body(bytes).retrieve().toBodilessEntity();
        } catch (RestClientException error) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "STORAGE_UPLOAD_FAILED", "The private document upload failed. Your application was not submitted.");
        }
    }

    private void runOcr(UUID id, String mime, String filename, byte[] bytes) {
        if (properties.ocrToken() == null || properties.ocrToken().isBlank()) return;
        JsonNode response;
        try {
            response = requestOcr(mime, filename, bytes);
        } catch (RestClientException firstFailure) {
            try {
                // Document analysis is read-only, so one retry is safe and helps with Render cold starts.
                response = requestOcr(mime, filename, bytes);
            } catch (RestClientException finalFailure) {
                jdbc.sql("update public.pharmacy_documents set quality_warnings='[\"OCR is temporarily unavailable; review this document manually.\"]'::jsonb where id=:id")
                        .param("id", id).update();
                return;
            }
        }
        var text = response == null ? "" : response.path("text").asText(response.path("extracted_text").asText(""));
        var fields = response != null && response.has("fields") ? response.get("fields") : response != null && response.has("candidate_fields") ? response.get("candidate_fields") : mapper.createObjectNode();
        var warnings = response != null && response.has("warnings") ? response.get("warnings") : response != null && response.has("quality_warnings") ? response.get("quality_warnings") : mapper.createArrayNode();
        jdbc.sql("""
                update public.pharmacy_documents set status='OCR_COMPLETE',ocr_text=:text,
                  ocr_fields=cast(:fields as jsonb),quality_warnings=cast(:warnings as jsonb) where id=:id
                """).param("text", text).param("fields", fields.toString()).param("warnings", warnings.toString()).param("id", id).update();
    }

    private JsonNode requestOcr(String mime, String filename, byte[] bytes) {
        var body = new MultipartBodyBuilder();
        var resource = new ByteArrayResource(bytes) { @Override public String getFilename() { return filename; } };
        body.part("file", resource).filename(filename).contentType(MediaType.parseMediaType(mime));
        return rest.post().uri(properties.ocrUrl() + "/v1/analyze").header("Authorization", "Bearer " + properties.ocrToken())
                .contentType(MediaType.MULTIPART_FORM_DATA).body(body.build()).retrieve().body(JsonNode.class);
    }

    private static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_FILE", "Choose a non-empty document.");
        if (file.getSize() > 10 * 1024 * 1024) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Documents must be 10 MB or smaller.");
        var mime = file.getContentType();
        if (!List.of("application/pdf", "image/jpeg", "image/png").contains(mime)) throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "INVALID_FILE_TYPE", "Use a PDF, JPG, or PNG document.");
        try {
            var prefix = file.getInputStream().readNBytes(8);
            boolean valid = (mime.equals("application/pdf") && prefix.length >= 4 && new String(prefix, 0, 4, StandardCharsets.US_ASCII).equals("%PDF"))
                    || (mime.equals("image/jpeg") && prefix.length >= 3 && (prefix[0]&255)==0xff && (prefix[1]&255)==0xd8 && (prefix[2]&255)==0xff)
                    || (mime.equals("image/png") && prefix.length >= 8 && (prefix[0]&255)==0x89 && prefix[1]==0x50 && prefix[2]==0x4e && prefix[3]==0x47);
            if (!valid) throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "FILE_SIGNATURE_MISMATCH", "The file contents do not match the selected file type.");
        } catch (ApiException error) { throw error; }
        catch (Exception error) { throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_READ_FAILED", "The selected file could not be inspected."); }
    }

    private List<String> readList(String json) { try { return mapper.readValue(json, mapper.getTypeFactory().constructCollectionType(List.class, String.class)); } catch (Exception e) { return List.of(); } }
    @SuppressWarnings("unchecked") private Map<String,Object> readMap(String json) { try { return mapper.readValue(json, Map.class); } catch (Exception e) { return Map.of(); } }
    private static String safeFilename(String name) { var clean = StringUtils.cleanPath(name == null ? "document" : name).replaceAll("[^A-Za-z0-9._-]", "-"); return clean.length() > 120 ? clean.substring(clean.length()-120) : clean; }
    private static String encodePath(String path) { return java.util.Arrays.stream(path.split("/")).map(part -> URLEncoder.encode(part, StandardCharsets.UTF_8).replace("+", "%20")).collect(java.util.stream.Collectors.joining("/")); }
    private static String label(String type) { return switch(type) { case "FDA_LICENSE" -> "FDA License to Operate"; case "BUSINESS_PERMIT" -> "Business Permit"; default -> "Pharmacist PRC ID"; }; }
    private static String publicStatus(String status) { return switch(status) { case "VERIFIED" -> "VERIFIED"; case "NEEDS_UPDATE", "REJECTED" -> "NEEDS_UPDATE"; default -> "UNDER_REVIEW"; }; }

    public record DocumentView(UUID id, String type, String label, String fileName, String status, Instant uploadedAt,
            String expiresAt, String adminMessage, List<String> qualityWarnings, Map<String,Object> extractedFields) {}
    public record SignedUrl(String url, Instant expiresAt) {}
}

