package care.oath.pharmacy.notification;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.security.CurrentUser;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;

@ExtendWith(MockitoExtension.class)
class NotificationServiceSecurityTest {
    @Mock JdbcClient jdbc;
    @Mock JdbcClient.StatementSpec statement;
    private NotificationService service;
    private final CurrentUser user = new CurrentUser(UUID.randomUUID(), "owner@example.com", "token");

    @BeforeEach
    void setUp() {
        service = new NotificationService(jdbc);
        when(jdbc.sql(anyString())).thenReturn(statement);
        when(statement.param(anyString(), org.mockito.ArgumentMatchers.any())).thenReturn(statement);
    }

    @Test
    void userCanMarkOnlyAnOwnedNotificationRead() {
        when(statement.update()).thenReturn(1);
        service.markRead(user, UUID.randomUUID());
        verify(jdbc).sql(argThat(sql -> sql.contains("id=:id") && sql.contains("user_id=:userId")
                && sql.contains("set read_at=coalesce(read_at,now())")));
    }

    @Test
    void updateThatMatchesNoOwnedNotificationIsReportedAsNotFound() {
        when(statement.update()).thenReturn(0);
        assertThatThrownBy(() -> service.markRead(user, UUID.randomUUID()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("not found");
    }
}
