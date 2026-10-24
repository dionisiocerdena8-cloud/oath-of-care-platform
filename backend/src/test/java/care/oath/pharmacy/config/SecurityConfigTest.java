package care.oath.pharmacy.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

class SecurityConfigTest {
    private final SecurityConfig config = new SecurityConfig();

    @Test
    void corsConfigurationSourceAllowsConfiguredOriginsAndHeaders() {
        var properties = new AppProperties(
                "http://localhost:3000,http://localhost:5173",
                "https://bxjgmuvhdxlvaekpofns.supabase.co",
                "test-pub-key",
                "https://oathofcare-ocr.onrender.com",
                "test-token",
                "at-least-32-chars-test-pepper-12345",
                "no-reply@oathofcare.local",
                false
        );

        var corsSource = config.corsConfigurationSource(properties);
        var request = new MockHttpServletRequest("GET", "/api/v1/applications/current");
        CorsConfiguration corsConfig = corsSource.getCorsConfiguration(request);

        assertThat(corsConfig).isNotNull();
        assertThat(corsConfig.getAllowedOrigins()).contains("http://localhost:3000", "http://localhost:5173");
        assertThat(corsConfig.getAllowedMethods()).contains("GET", "POST", "PUT", "DELETE", "OPTIONS");
        assertThat(corsConfig.getAllowedHeaders()).contains("Authorization", "Content-Type");
        assertThat(corsConfig.getAllowCredentials()).isTrue();
    }

    @Test
    void jwtDecoderBeanIsConfiguredForSupabaseEndpoint() {
        var properties = new AppProperties(
                "http://localhost:3000",
                "https://bxjgmuvhdxlvaekpofns.supabase.co",
                "test-pub-key",
                "https://oathofcare-ocr.onrender.com",
                "test-token",
                "at-least-32-chars-test-pepper-12345",
                "no-reply@oathofcare.local",
                false
        );

        var decoder = config.jwtDecoder(properties);
        assertThat(decoder).isNotNull();
    }
}

