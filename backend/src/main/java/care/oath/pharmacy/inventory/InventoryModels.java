package care.oath.pharmacy.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class InventoryModels {
    private InventoryModels() {}

    public enum StockLevel { HIGH_STOCK, MEDIUM_STOCK, LOW_STOCK, OUT_OF_STOCK }

    public record MedicineRequest(
            @NotBlank @Size(max = 160) String genericName,
            @NotBlank @Size(max = 160) String brandName,
            @NotNull @Positive BigDecimal dosageValue,
            @NotBlank String dosageUnit,
            @NotBlank @Size(max = 100) String category,
            @NotNull @DecimalMin("0.00") BigDecimal price,
            @NotNull StockLevel stockStatus,
            boolean prescriptionRequired,
            Long version
    ) {}

    public record MedicineView(
            UUID id, String genericName, String brandName, BigDecimal dosageValue, String dosageUnit,
            String category, BigDecimal price, StockLevel stockStatus, boolean prescriptionRequired,
            Instant lastUpdated, long version
    ) {}
}

