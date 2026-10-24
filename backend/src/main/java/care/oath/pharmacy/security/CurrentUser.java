package care.oath.pharmacy.security;

import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;

public record CurrentUser(UUID id, String email, String accessToken) {
    public static CurrentUser from(Jwt jwt) {
        return new CurrentUser(UUID.fromString(jwt.getSubject()), jwt.getClaimAsString("email"), jwt.getTokenValue());
    }
}

