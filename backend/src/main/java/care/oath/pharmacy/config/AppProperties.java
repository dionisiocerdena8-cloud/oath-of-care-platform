package care.oath.pharmacy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(
        String corsOrigins,
        String supabaseUrl,
        String supabasePublishableKey,
        String ocrUrl,
        String ocrToken,
        String challengePepper,
        String mailFrom,
        boolean requireSecureSecrets
) {}

