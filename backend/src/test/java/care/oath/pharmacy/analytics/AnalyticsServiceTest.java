package care.oath.pharmacy.analytics;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.security.CurrentUser;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {
    @Mock JdbcClient jdbc;
    @Mock MembershipService memberships;

    @Test void rejectsReversedRangeBeforeDatabaseQuery() {
        var service = new AnalyticsService(jdbc, memberships);
        var user = new CurrentUser(UUID.randomUUID(), "owner@example.com", "token");
        assertThatThrownBy(() -> service.summary(user, LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 1)))
                .isInstanceOf(ApiException.class).hasMessageContaining("Start date");
        verifyNoInteractions(jdbc, memberships);
    }
}

