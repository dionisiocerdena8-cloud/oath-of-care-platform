package care.oath.pharmacy;

import care.oath.pharmacy.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class PharmacyApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(PharmacyApiApplication.class, args);
    }
}

