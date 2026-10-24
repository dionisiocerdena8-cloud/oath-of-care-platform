package care.oath.pharmacy.pharmacy;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.membership.MembershipService.Membership;
import care.oath.pharmacy.pharmacy.PharmacyModels.ApplicationView;
import care.oath.pharmacy.pharmacy.PharmacyModels.RegistrationData;
import care.oath.pharmacy.pharmacy.PharmacyModels.RegistrationRequest;
import care.oath.pharmacy.security.CurrentUser;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class PharmacyServiceSecurityTest {
    @Mock PharmacyRepository repository;
    @Mock MembershipService memberships;
    private PharmacyService service;
    private final UUID userId = UUID.randomUUID();
    private final CurrentUser user = new CurrentUser(userId, "staff@example.com", "token");

    @BeforeEach void setUp() { service = new PharmacyService(repository, memberships); }

    @Test
    void nonOwnerCannotEditAnExistingApplicationDraft() {
        var pharmacyId = UUID.randomUUID();
        var staff = new Membership(pharmacyId, "STAFF", "Care Pharmacy", "DRAFT");
        when(repository.pharmacyForUser(userId)).thenReturn(Optional.of(pharmacyId));
        when(memberships.requireMembership(user, false)).thenReturn(staff);
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "OWNER_REQUIRED", "Pharmacy owner access is required."))
                .when(memberships).requireOwner(staff);

        assertThatThrownBy(() -> service.saveDraft(user, request()))
                .isInstanceOf(ApiException.class).hasMessageContaining("owner");
        verify(repository, never()).updateDraft(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void firstDraftCreatesOnlyTheAuthenticatedUsersOwnerApplication() {
        var pharmacyId = UUID.randomUUID();
        var applicationId = UUID.randomUUID();
        when(repository.pharmacyForUser(userId)).thenReturn(Optional.empty());
        when(repository.createPharmacy(request().data())).thenReturn(pharmacyId);
        when(repository.createApplication(pharmacyId, userId)).thenReturn(applicationId);
        when(repository.updateDraft(pharmacyId, userId, request().data())).thenReturn(1);
        when(repository.application(userId)).thenReturn(Optional.of(new ApplicationView(applicationId, "DRAFT", null, null, List.of())));

        service.saveDraft(user, request());

        verify(repository).createApplication(pharmacyId, userId);
        verify(repository).updateDraft(pharmacyId, userId, request().data());
    }

    private RegistrationRequest request() {
        return new RegistrationRequest(new RegistrationData(
                "staff@example.com", "Care Pharmacy", "09170000000", "care@example.com",
                "Care Pharmacy Inc.", "Corporation", "REG-1", "PERMIT-1", "TIN-1",
                "Manila", "Owner", "14.5995", "120.9842", "Manila"), List.of(), List.of());
    }
}
