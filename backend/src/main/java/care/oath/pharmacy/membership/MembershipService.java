package care.oath.pharmacy.membership;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.security.CurrentUser;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class MembershipService {
    private final JdbcClient jdbc;

    public MembershipService(JdbcClient jdbc) { this.jdbc = jdbc; }

    public Membership requireMembership(CurrentUser user, boolean approved) {
        var sql = """
                select m.pharmacy_id, m.role::text, p.display_name, p.verification_status::text
                from public.pharmacy_memberships m
                join public.pharmacies p on p.id = m.pharmacy_id
                where m.user_id = :userId and m.status = 'ACTIVE' and p.archived_at is null
                order by m.created_at limit 1
                """;
        var membership = jdbc.sql(sql).param("userId", user.id()).query((rs, row) -> new Membership(
                rs.getObject("pharmacy_id", UUID.class), rs.getString("role"), rs.getString("display_name"), rs.getString("verification_status"))).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "PHARMACY_MEMBERSHIP_REQUIRED", "No active pharmacy membership is linked to this account."));
        if (approved && !"APPROVED".equals(membership.verificationStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PHARMACY_NOT_APPROVED", "The pharmacy must be approved before operational features can be used.");
        }
        return membership;
    }

    public void requireManager(Membership membership) {
        if (!membership.role().equals("OWNER") && !membership.role().equals("MANAGER")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "MANAGER_REQUIRED", "Owner or manager access is required.");
        }
    }

    public void requireOwner(Membership membership) {
        if (!membership.role().equals("OWNER")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "OWNER_REQUIRED", "Pharmacy owner access is required.");
        }
    }

    public void requireInventoryEditor(Membership membership) {
        if (!membership.role().equals("OWNER") && !membership.role().equals("MANAGER") && !membership.role().equals("STAFF")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "INVENTORY_ACCESS_REQUIRED", "Active pharmacy staff access is required.");
        }
    }

    public record Membership(UUID pharmacyId, String role, String pharmacyName, String verificationStatus) {}
}

