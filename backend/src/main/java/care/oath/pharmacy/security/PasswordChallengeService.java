package care.oath.pharmacy.security;

import care.oath.pharmacy.config.AppProperties;
import care.oath.pharmacy.error.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordChallengeService {
    private final JdbcClient jdbc;
    private final JavaMailSender mail;
    private final AppProperties properties;
    private final SecureRandom random = new SecureRandom();

    public PasswordChallengeService(JdbcClient jdbc, JavaMailSender mail, AppProperties properties) {
        this.jdbc = jdbc; this.mail = mail; this.properties = properties;
        if (properties.requireSecureSecrets()
                && (properties.challengePepper() == null
                    || properties.challengePepper().length() < 32
                    || properties.challengePepper().equals("development-only-change-me"))) {
            throw new IllegalStateException("SECURITY_CHALLENGE_PEPPER must be a unique random value of at least 32 characters");
        }
    }

    @Transactional
    public Challenge issue(CurrentUser user) {
        if (user.email() == null || user.email().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "EMAIL_REQUIRED", "This identity has no verified email for a security challenge.");
        jdbc.sql("delete from private.security_challenges where user_id=:userId and created_at < now()-interval '30 days'")
                .param("userId", user.id()).update();
        var recent = jdbc.sql("select count(*) from private.security_challenges where user_id=:userId and created_at > now()-interval '15 minutes'")
                .param("userId", user.id()).query(Integer.class).single();
        if (recent >= 3) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CHALLENGE_RATE_LIMIT", "Too many codes were requested. Try again in 15 minutes.");
        jdbc.sql("update private.security_challenges set consumed_at=now() where user_id=:userId and consumed_at is null")
                .param("userId", user.id()).update();
        var code = "%06d".formatted(random.nextInt(1_000_000));
        var expires = Instant.now().plus(10, ChronoUnit.MINUTES);
        var id = jdbc.sql("insert into private.security_challenges(user_id,code_digest,expires_at) values (:userId,:digest,:expires) returning id")
                .param("userId", user.id()).param("digest", digest(code)).param("expires", expires).query(UUID.class).single();
        var message = new SimpleMailMessage();
        message.setFrom(properties.mailFrom());
        message.setTo(user.email());
        message.setSubject("Oath of Care security verification code");
        message.setText("Your Oath of Care verification code is " + code + ". It expires in 10 minutes. If you did not request this, ignore this message.");
        try { mail.send(message); }
        catch (RuntimeException error) {
            jdbc.sql("update private.security_challenges set consumed_at=now() where id=:id").param("id", id).update();
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_UNAVAILABLE", "The security email could not be sent. Try again later.");
        }
        return new Challenge(id, mask(user.email()), expires);
    }

    @Transactional
    public VerifiedChallenge verify(CurrentUser user, UUID id, String code) {
        if (code == null || !code.matches("\\d{6}")) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CODE", "Enter the complete 6-digit code.");
        var row = jdbc.sql("""
                select code_digest,attempts,expires_at,consumed_at from private.security_challenges
                where id=:id and user_id=:userId for update
                """).param("id", id).param("userId", user.id()).query((rs, n) -> new ChallengeRow(
                        rs.getString("code_digest"), rs.getInt("attempts"), rs.getTimestamp("expires_at").toInstant(),
                        rs.getTimestamp("consumed_at") == null ? null : rs.getTimestamp("consumed_at").toInstant())).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHALLENGE_NOT_FOUND", "The verification challenge was not found."));
        if (row.consumedAt() != null || row.expiresAt().isBefore(Instant.now()) || row.attempts() >= 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_EXPIRED", "The code expired. Request a new one.");
        }
        if (!MessageDigest.isEqual(row.digest().getBytes(StandardCharsets.UTF_8), digest(code).getBytes(StandardCharsets.UTF_8))) {
            jdbc.sql("update private.security_challenges set attempts=attempts+1 where id=:id").param("id", id).update();
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CODE", "The code is incorrect or expired.");
        }
        var token = Base64.getUrlEncoder().withoutPadding().encodeToString(random.generateSeed(32));
        var until = Instant.now().plus(5, ChronoUnit.MINUTES);
        jdbc.sql("update private.security_challenges set verified_token_digest=:digest,verified_until=:until where id=:id")
                .param("digest", digest(token)).param("until", until).param("id", id).update();
        return new VerifiedChallenge(token, until);
    }

    public void consumeVerifiedToken(CurrentUser user, String token) {
        int changed = jdbc.sql("""
                update private.security_challenges set consumed_at=now()
                where user_id=:userId and verified_token_digest=:digest and verified_until>now() and consumed_at is null
                """).param("userId", user.id()).param("digest", digest(token)).update();
        if (changed == 0) throw new ApiException(HttpStatus.FORBIDDEN, "VERIFICATION_REQUIRED", "Identity verification expired. Start again.");
    }

    private String digest(String value) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.challengePepper().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) { throw new IllegalStateException("Unable to hash security challenge", error); }
    }
    private static String mask(String email) {
        var parts = email.split("@", 2); var local = parts[0];
        return local.substring(0, Math.min(2, local.length())) + "***@" + (parts.length > 1 ? parts[1] : "");
    }
    private record ChallengeRow(String digest, int attempts, Instant expiresAt, Instant consumedAt) {}
    public record Challenge(UUID challengeId, String maskedEmail, Instant expiresAt) {}
    public record VerifiedChallenge(String verificationToken, Instant expiresAt) {}
}

