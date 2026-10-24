package care.oath.pharmacy.security;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/password-challenges")
public class PasswordChallengeController {
    private final PasswordChallengeService service;
    public PasswordChallengeController(PasswordChallengeService service) { this.service = service; }
    @PostMapping PasswordChallengeService.Challenge issue(@AuthenticationPrincipal Jwt jwt) { return service.issue(CurrentUser.from(jwt)); }
    @PostMapping("/{id}/verify") PasswordChallengeService.VerifiedChallenge verify(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody VerifyRequest request) {
        return service.verify(CurrentUser.from(jwt), id, request.code());
    }
    @PostMapping("/consume") void consume(@AuthenticationPrincipal Jwt jwt, @RequestBody ConsumeRequest request) {
        service.consumeVerifiedToken(CurrentUser.from(jwt), request.verificationToken());
    }
    public record VerifyRequest(@Pattern(regexp = "\\d{6}") String code) {}
    public record ConsumeRequest(String verificationToken) {}
}

