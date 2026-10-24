package care.oath.pharmacy.pharmacy;

import care.oath.pharmacy.config.AppProperties;
import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.security.CurrentUser;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProfileMediaService {
    private final JdbcClient jdbc;
    private final MembershipService memberships;
    private final AppProperties properties;
    private final RestClient rest;

    public ProfileMediaService(JdbcClient jdbc, MembershipService memberships, AppProperties properties, RestClient.Builder builder) {
        this.jdbc = jdbc; this.memberships = memberships; this.properties = properties; this.rest = builder.build();
    }

    public MediaResult upload(CurrentUser user, MultipartFile file) {
        var membership = memberships.requireMembership(user, true); memberships.requireManager(membership);
        if (file == null || file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PHOTO", "Choose a non-empty pharmacy image up to 10 MB.");
        if (!List.of("image/jpeg","image/png","image/webp").contains(file.getContentType())) throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "INVALID_PHOTO_TYPE", "Use a JPG, PNG, or WebP pharmacy image.");
        validateSignature(file);
        if (properties.supabasePublishableKey() == null || properties.supabasePublishableKey().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_NOT_CONFIGURED", "Pharmacy media storage is not configured on the backend.");
        }
        var path = user.id() + "/" + membership.pharmacyId() + "/" + UUID.randomUUID() + "-store-photo" + extension(file.getContentType());
        try {
            rest.post().uri(properties.supabaseUrl() + "/storage/v1/object/pharmacy-media/" + encodePath(path))
                    .header("apikey", properties.supabasePublishableKey()).header("Authorization", "Bearer " + user.accessToken())
                    .header("x-upsert", "false").contentType(MediaType.parseMediaType(file.getContentType())).body(file.getBytes()).retrieve().toBodilessEntity();
            jdbc.sql("update public.pharmacies set logo_path=:path,version=version+1 where id=:id").param("path", path).param("id", membership.pharmacyId()).update();
            return new MediaResult(path, publicUrl(path));
        } catch (ApiException error) { throw error; }
        catch (Exception error) { throw new ApiException(HttpStatus.BAD_GATEWAY, "PHOTO_UPLOAD_FAILED", "The pharmacy image could not be uploaded."); }
    }

    public PublicMedia current(CurrentUser user) {
        var pharmacy = memberships.requireMembership(user, true).pharmacyId();
        var path = jdbc.sql("select logo_path from public.pharmacies where id=:id and logo_path is not null")
                .param("id", pharmacy).query(String.class).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PHOTO_NOT_FOUND", "No pharmacy image has been uploaded."));
        return new PublicMedia(publicUrl(path));
    }

    private String publicUrl(String path) { return properties.supabaseUrl() + "/storage/v1/object/public/pharmacy-media/" + encodePath(path); }

    private static String encodePath(String path) { return java.util.Arrays.stream(path.split("/")).map(part -> URLEncoder.encode(part, StandardCharsets.UTF_8).replace("+", "%20")).collect(java.util.stream.Collectors.joining("/")); }
    private static String extension(String mime) { return switch (mime) { case "image/png" -> ".png"; case "image/webp" -> ".webp"; default -> ".jpg"; }; }
    private static void validateSignature(MultipartFile file) {
        try {
            var prefix = file.getInputStream().readNBytes(12);
            var mime = file.getContentType();
            boolean valid = ("image/jpeg".equals(mime) && prefix.length >= 3 && (prefix[0] & 255) == 0xff && (prefix[1] & 255) == 0xd8 && (prefix[2] & 255) == 0xff)
                    || ("image/png".equals(mime) && prefix.length >= 8 && (prefix[0] & 255) == 0x89 && prefix[1] == 0x50 && prefix[2] == 0x4e && prefix[3] == 0x47)
                    || ("image/webp".equals(mime) && prefix.length >= 12
                        && new String(prefix, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                        && new String(prefix, 8, 4, StandardCharsets.US_ASCII).equals("WEBP"));
            if (!valid) throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "PHOTO_SIGNATURE_MISMATCH", "The image contents do not match the selected file type.");
        } catch (ApiException error) {
            throw error;
        } catch (Exception error) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTO_READ_FAILED", "The pharmacy image could not be inspected.");
        }
    }
    public record MediaResult(String logoPath, String url) {}
    public record PublicMedia(String url) {}
}

