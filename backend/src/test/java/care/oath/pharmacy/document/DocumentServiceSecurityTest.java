package care.oath.pharmacy.document;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import care.oath.pharmacy.config.AppProperties;
import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.membership.MembershipService.Membership;
import care.oath.pharmacy.security.CurrentUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.client.RestClient;

@ExtendWith(MockitoExtension.class)
class DocumentServiceSecurityTest {
    @Mock JdbcClient jdbc;
    @Mock MembershipService memberships;
    @Mock AppProperties properties;
    private DocumentService service;
    private final CurrentUser user = new CurrentUser(UUID.randomUUID(), "staff@example.com", "token");

    @BeforeEach
    void setUp() {
        service = new DocumentService(jdbc, memberships, properties, new ObjectMapper(), RestClient.builder());
    }

    @Test
    void regularStaffCannotListSensitiveRegulatoryDocuments() {
        var staff = new Membership(UUID.randomUUID(), "STAFF", "Care Pharmacy", "DRAFT");
        when(memberships.requireMembership(user, false)).thenReturn(staff);
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "MANAGER_REQUIRED", "Owner or manager access is required."))
                .when(memberships).requireManager(staff);

        assertThatThrownBy(() -> service.list(user))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Owner or manager");
        verifyNoInteractions(jdbc);
    }
}
