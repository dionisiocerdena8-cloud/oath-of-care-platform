package care.oath.pharmacy.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;

@Configuration
public class HttpClientConfig {
    @Bean
    RestClientCustomizer externalApiTimeouts() {
        var client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
        var factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(75));
        return builder -> builder.requestFactory(factory);
    }
}
