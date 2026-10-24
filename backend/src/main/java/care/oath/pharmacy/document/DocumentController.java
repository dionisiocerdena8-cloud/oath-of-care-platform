package care.oath.pharmacy.document;

import care.oath.pharmacy.security.CurrentUser;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {
    private final DocumentService service;
    public DocumentController(DocumentService service) { this.service = service; }
    @GetMapping List<DocumentService.DocumentView> list(@AuthenticationPrincipal Jwt jwt) { return service.list(CurrentUser.from(jwt)); }
    @PostMapping(path="/{type}", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    DocumentService.DocumentView upload(@AuthenticationPrincipal Jwt jwt, @PathVariable String type, @RequestPart("file") MultipartFile file) { return service.upload(CurrentUser.from(jwt), type, file); }
    @PostMapping("/{id}/signed-url") DocumentService.SignedUrl signedUrl(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return service.signedUrl(CurrentUser.from(jwt), id); }
}

