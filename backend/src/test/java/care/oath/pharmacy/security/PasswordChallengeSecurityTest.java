package care.oath.pharmacy.security;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import care.oath.pharmacy.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class PasswordChallengeSecurityTest {
    @Mock JdbcClient jdbc;
    @Mock JavaMailSender mail;
    @Mock AppProperties properties;

    @Test
    void productionModeRejectsTheDevelopmentPepper() {
        when(properties.requireSecureSecrets()).thenReturn(true);
        when(properties.challengePepper()).thenReturn("development-only-change-me");

        assertThatThrownBy(() -> new PasswordChallengeService(jdbc, mail, properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SECURITY_CHALLENGE_PEPPER");
    }
}
