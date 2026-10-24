package care.oath.pharmacy.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.inventory.InventoryModels.MedicineRequest;
import care.oath.pharmacy.inventory.InventoryModels.MedicineView;
import care.oath.pharmacy.inventory.InventoryModels.StockLevel;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.membership.MembershipService.Membership;
import care.oath.pharmacy.security.CurrentUser;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {
    @Mock InventoryRepository repository;
    @Mock MembershipService memberships;
    InventoryService service;
    UUID userId = UUID.randomUUID();
    UUID pharmacyId = UUID.randomUUID();
    CurrentUser user = new CurrentUser(userId, "owner@example.com", "token");

    @BeforeEach void setUp() { service = new InventoryService(repository, memberships); }

    @Test void rejectsUnsupportedDosageUnitBeforeWriting() {
        var request = request("grams", 0L);
        assertThatThrownBy(() -> service.create(user, request, "CREATED"))
                .isInstanceOf(ApiException.class).hasMessageContaining("Unsupported dosage unit");
    }

    @Test void createsListingInsideAuthorizedPharmacy() {
        var request = request("mg", null);
        var catalogId = UUID.randomUUID(); var listingId = UUID.randomUUID();
        var saved = view(listingId, 0);
        when(memberships.requireMembership(user, true)).thenReturn(new Membership(pharmacyId, "OWNER", "Care Pharmacy", "APPROVED"));
        when(repository.upsertCatalog(any(), eq(request))).thenReturn(catalogId);
        when(repository.insert(pharmacyId, catalogId, userId, request)).thenReturn(listingId);
        when(repository.find(pharmacyId, listingId)).thenReturn(saved);

        assertThat(service.create(user, request, "CREATED")).isEqualTo(saved);
        verify(repository).history(pharmacyId, listingId, userId, "CREATED", null, saved);
    }

    @Test void rejectsStaleConcurrentUpdate() {
        var id = UUID.randomUUID(); var request = request("mg", 2L); var before = view(id, 3);
        when(memberships.requireMembership(user, true)).thenReturn(new Membership(pharmacyId, "OWNER", "Care Pharmacy", "APPROVED"));
        when(repository.find(pharmacyId, id)).thenReturn(before);
        when(repository.upsertCatalog(any(), eq(request))).thenReturn(UUID.randomUUID());
        when(repository.update(eq(pharmacyId), eq(id), any(), eq(userId), eq(request), eq(2L))).thenReturn(0);

        assertThatThrownBy(() -> service.update(user, id, request))
                .isInstanceOf(ApiException.class).hasMessageContaining("Refresh and try again");
    }

    @Test void neverUpdatesAListingOutsideTheAuthenticatedUsersPharmacy() {
        var otherPharmacyListing = UUID.randomUUID();
        var request = request("mg", 0L);
        when(memberships.requireMembership(user, true)).thenReturn(new Membership(pharmacyId, "STAFF", "Care Pharmacy", "APPROVED"));
        when(repository.find(pharmacyId, otherPharmacyListing))
                .thenThrow(new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "MEDICINE_NOT_FOUND", "Medicine listing not found."));

        assertThatThrownBy(() -> service.update(user, otherPharmacyListing, request))
                .isInstanceOf(ApiException.class).hasMessageContaining("not found");
        verify(memberships).requireInventoryEditor(new Membership(pharmacyId, "STAFF", "Care Pharmacy", "APPROVED"));
        verify(repository, never()).update(any(), any(), any(), any(), any(), anyLong());
    }

    private MedicineRequest request(String unit, Long version) {
        return new MedicineRequest("Paracetamol", "Biogesic", new BigDecimal("500"), unit, "Analgesic",
                new BigDecimal("6.50"), StockLevel.LOW_STOCK, false, version);
    }
    private MedicineView view(UUID id, long version) {
        return new MedicineView(id, "Paracetamol", "Biogesic", new BigDecimal("500"), "mg", "Analgesic",
                new BigDecimal("6.50"), StockLevel.LOW_STOCK, false, Instant.now(), version);
    }
}

