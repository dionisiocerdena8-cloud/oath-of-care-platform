package care.oath.pharmacy.pharmacy;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PharmacyModels {
    private PharmacyModels() {}

    public record RegistrationData(
            @Email String email,
            @NotBlank @Size(max = 160) String pharmacyName,
            @Size(max = 40) String contact,
            @Email String contactEmail,
            @Size(max = 200) String businessName,
            @Size(max = 80) String businessType,
            @Size(max = 100) String registrationNo,
            @Size(max = 100) String permitNo,
            @Size(max = 50) String tin,
            @Size(max = 500) String registeredAddress,
            @Size(max = 160) String contactPerson,
            String latitude,
            String longitude,
            @Size(max = 300) String conciseAddress
    ) {}

    public record OperatingDay(@NotBlank String day, boolean isOpen, boolean is24Hours, String open, String close) {}
    public record HolidayException(UUID id, @NotBlank String date, boolean isClosed, String open, String close) {}
    public record RegistrationRequest(@NotNull @Valid RegistrationData data, @NotNull List<@Valid OperatingDay> hours, @NotNull List<@Valid HolidayException> holidays) {}

    public record ApplicationView(UUID id, String status, Instant submittedAt, String reviewerMessage, List<String> requestedChanges) {}
    public record PharmacyIdentity(String pharmacyName, String email, String role, String initials, String verificationStatus) {}
    public record ProfileView(UUID id, String pharmacyName, String contactEmail, String contactPhone, String fullAddress,
            String barangay, BigDecimal latitude, BigDecimal longitude, String conciseAddress, String logoPath,
            long version, List<OperatingDay> hours) {}
    public record ProfileRequest(
            @NotBlank @Size(max = 160) String pharmacyName,
            @Email String contactEmail,
            @Size(max = 40) String contactPhone,
            @Size(max = 500) String fullAddress,
            @Size(max = 120) String barangay,
            BigDecimal latitude,
            BigDecimal longitude,
            @Size(max = 300) String conciseAddress,
            Long version,
            @NotNull List<@Valid OperatingDay> hours
    ) {}
}

