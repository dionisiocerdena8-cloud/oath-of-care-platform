package care.oath.pharmacy.inventory;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.inventory.InventoryModels.MedicineRequest;
import care.oath.pharmacy.inventory.InventoryModels.MedicineView;
import care.oath.pharmacy.inventory.InventoryModels.StockLevel;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.security.CurrentUser;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private static final List<String> UNITS = List.of("mg", "g", "mcg", "mL", "L", "%", "IU", "tablet", "capsule");
    private final InventoryRepository repository;
    private final MembershipService memberships;

    public InventoryService(InventoryRepository repository, MembershipService memberships) {
        this.repository = repository;
        this.memberships = memberships;
    }

    public List<MedicineView> list(CurrentUser user, String search, String status, String category, String sort) {
        var membership = memberships.requireMembership(user, true);
        return repository.list(membership.pharmacyId(), search, status, category, sort);
    }

    @Transactional
    public MedicineView create(CurrentUser user, MedicineRequest request, String action) {
        validate(request);
        var membership = memberships.requireMembership(user, true);
        memberships.requireInventoryEditor(membership);
        var catalog = repository.upsertCatalog(normalizedKey(request), request);
        var id = repository.insert(membership.pharmacyId(), catalog, user.id(), request);
        var saved = repository.find(membership.pharmacyId(), id);
        repository.history(membership.pharmacyId(), id, user.id(), action, null, saved);
        if (saved.stockStatus() == StockLevel.LOW_STOCK || saved.stockStatus() == StockLevel.OUT_OF_STOCK) repository.notifyAvailability(membership.pharmacyId(), saved);
        return saved;
    }

    @Transactional
    public MedicineView update(CurrentUser user, UUID id, MedicineRequest request) {
        validate(request);
        var membership = memberships.requireMembership(user, true);
        memberships.requireInventoryEditor(membership);
        var before = repository.find(membership.pharmacyId(), id);
        var catalog = repository.upsertCatalog(normalizedKey(request), request);
        long version = request.version() == null ? before.version() : request.version();
        if (repository.update(membership.pharmacyId(), id, catalog, user.id(), request, version) == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "STALE_INVENTORY_RECORD", "This medicine changed after you opened it. Refresh and try again.");
        }
        var saved = repository.find(membership.pharmacyId(), id);
        repository.history(membership.pharmacyId(), id, user.id(), "UPDATED", before, saved);
        if (saved.stockStatus() != before.stockStatus() && (saved.stockStatus() == StockLevel.LOW_STOCK || saved.stockStatus() == StockLevel.OUT_OF_STOCK)) repository.notifyAvailability(membership.pharmacyId(), saved);
        return saved;
    }

    @Transactional
    public void remove(CurrentUser user, UUID id) {
        var membership = memberships.requireMembership(user, true);
        memberships.requireInventoryEditor(membership);
        var before = repository.find(membership.pharmacyId(), id);
        if (repository.deactivate(membership.pharmacyId(), id, user.id()) == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "MEDICINE_NOT_FOUND", "Medicine listing not found.");
        }
        repository.history(membership.pharmacyId(), id, user.id(), "DEACTIVATED", before, null);
    }

    @Transactional
    public List<MedicineView> importRows(CurrentUser user, List<MedicineRequest> rows) {
        if (rows.isEmpty() || rows.size() > 500) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMPORT_SIZE", "Import between 1 and 500 medicines at a time.");
        return rows.stream().map(row -> create(user, row, "IMPORTED")).toList();
    }

    private void validate(MedicineRequest request) {
        if (!UNITS.contains(request.dosageUnit())) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOSAGE_UNIT", "Unsupported dosage unit.");
        if (request.price().scale() > 2 || request.price().compareTo(new BigDecimal("1000000")) > 0) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PRICE", "Price must be a valid PHP amount with at most two decimal places.");
    }

    private String normalizedKey(MedicineRequest request) {
        return Normalizer.normalize(String.join("|", request.genericName(), request.brandName(), request.dosageValue().stripTrailingZeros().toPlainString(), request.dosageUnit()), Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}

