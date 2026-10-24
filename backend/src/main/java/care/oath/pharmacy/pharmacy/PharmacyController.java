package care.oath.pharmacy.pharmacy;

import care.oath.pharmacy.pharmacy.PharmacyModels.ApplicationView;
import care.oath.pharmacy.pharmacy.PharmacyModels.PharmacyIdentity;
import care.oath.pharmacy.pharmacy.PharmacyModels.ProfileRequest;
import care.oath.pharmacy.pharmacy.PharmacyModels.ProfileView;
import care.oath.pharmacy.pharmacy.PharmacyModels.RegistrationRequest;
import care.oath.pharmacy.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PharmacyController {
    private final PharmacyService service;
    public PharmacyController(PharmacyService service) { this.service = service; }

    @GetMapping("/me/identity") PharmacyIdentity identity(@AuthenticationPrincipal Jwt jwt) { return service.identity(CurrentUser.from(jwt)); }
    @GetMapping("/applications/current") ApplicationView application(@AuthenticationPrincipal Jwt jwt) { return service.application(CurrentUser.from(jwt)); }
    @PutMapping("/applications/current/draft") ApplicationView draft(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RegistrationRequest request) { return service.saveDraft(CurrentUser.from(jwt), request); }
    @PostMapping("/applications/current/submit") ApplicationView submit(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RegistrationRequest request) { return service.submit(CurrentUser.from(jwt), request); }
    @GetMapping("/pharmacy/profile") ProfileView profile(@AuthenticationPrincipal Jwt jwt) { return service.profile(CurrentUser.from(jwt)); }
    @PutMapping("/pharmacy/profile") ProfileView profile(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProfileRequest request) { return service.updateProfile(CurrentUser.from(jwt), request); }
}

