package care.oath.pharmacy.pharmacy;

import care.oath.pharmacy.security.CurrentUser;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/pharmacy/profile/photo")
public class ProfileMediaController {
    private final ProfileMediaService service;
    public ProfileMediaController(ProfileMediaService service) { this.service = service; }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ProfileMediaService.MediaResult upload(@AuthenticationPrincipal Jwt jwt, @RequestPart("file") MultipartFile file) { return service.upload(CurrentUser.from(jwt), file); }
    @GetMapping ProfileMediaService.PublicMedia current(@AuthenticationPrincipal Jwt jwt) { return service.current(CurrentUser.from(jwt)); }
}

