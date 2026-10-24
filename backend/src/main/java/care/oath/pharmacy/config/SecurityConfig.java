package care.oath.pharmacy.config;

import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(resource -> resource
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint((request, response, authException) -> {
                            log.warn("Authentication failed for {} {}: {}", request.getMethod(), request.getRequestURI(), authException.getMessage());
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"message\":\"" + authException.getMessage().replace("\"", "'") + "\",\"code\":\"UNAUTHORIZED\"}");
                        }))
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder(AppProperties properties) {
        String baseUrl = properties.supabaseUrl().replaceAll("/+$", "");
        String jwkSetUri = baseUrl + "/auth/v1/.well-known/jwks.json";
        String issuerUri = baseUrl + "/auth/v1";

        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                .jwsAlgorithms(algs -> {
                    algs.add(SignatureAlgorithm.ES256);
                    algs.add(SignatureAlgorithm.RS256);
                    algs.add(SignatureAlgorithm.ES384);
                    algs.add(SignatureAlgorithm.ES512);
                    algs.add(SignatureAlgorithm.RS384);
                    algs.add(SignatureAlgorithm.RS512);
                })
                .build();

        OAuth2TokenValidator<Jwt> defaultValidator = JwtValidators.createDefaultWithIssuer(issuerUri);
        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<Object>>("aud",
                aud -> aud != null && (aud.contains("authenticated") || aud.stream().anyMatch(a -> "authenticated".equals(String.valueOf(a)))));

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(defaultValidator, audienceValidator));
        return decoder;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties properties) {
        var configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(properties.corsOrigins().split(",")).map(String::trim).filter(s -> !s.isBlank()).toList());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "If-Match", "Accept", "X-Requested-With"));
        configuration.setExposedHeaders(Arrays.asList("Content-Disposition", "ETag"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

