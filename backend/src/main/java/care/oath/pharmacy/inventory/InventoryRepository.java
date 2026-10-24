package care.oath.pharmacy.inventory;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.inventory.InventoryModels.MedicineRequest;
import care.oath.pharmacy.inventory.InventoryModels.MedicineView;
import care.oath.pharmacy.inventory.InventoryModels.StockLevel;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;

@Repository
public class InventoryRepository {
    private final JdbcClient jdbc;

    public InventoryRepository(JdbcClient jdbc) { this.jdbc = jdbc; }

    public List<MedicineView> list(UUID pharmacyId, String search, String status, String category, String sort) {
        var order = switch (sort == null ? "name" : sort) {
            case "price" -> "pm.price desc, c.brand_name";
            case "availability" -> "pm.stock_status, c.brand_name";
            case "updated" -> "pm.updated_at desc";
            default -> "c.brand_name, c.generic_name";
        };
        var sql = """
                select pm.id, c.generic_name, c.brand_name, c.dosage_value, c.dosage_unit, c.category,
                       pm.price, pm.stock_status::text, c.prescription_required, pm.updated_at, pm.version
                from public.pharmacy_medicines pm join public.medicine_catalog c on c.id = pm.medicine_id
                where pm.pharmacy_id = :pharmacyId and pm.active
                  and (:search = '' or lower(c.generic_name || ' ' || c.brand_name || ' ' || c.dosage_value || c.dosage_unit) like :searchLike)
                  and (:status = '' or pm.stock_status::text = :status)
                  and (:category = '' or c.category = :category)
                order by %s
                """.formatted(order);
        return jdbc.sql(sql)
                .param("pharmacyId", pharmacyId).param("search", clean(search)).param("searchLike", "%" + clean(search).toLowerCase() + "%")
                .param("status", clean(status)).param("category", clean(category)).query(this::map).list();
    }

    public MedicineView find(UUID pharmacyId, UUID id) {
        return jdbc.sql("""
                select pm.id, c.generic_name, c.brand_name, c.dosage_value, c.dosage_unit, c.category,
                       pm.price, pm.stock_status::text, c.prescription_required, pm.updated_at, pm.version
                from public.pharmacy_medicines pm join public.medicine_catalog c on c.id = pm.medicine_id
                where pm.pharmacy_id = :pharmacyId and pm.id = :id and pm.active
                """).param("pharmacyId", pharmacyId).param("id", id).query(this::map).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEDICINE_NOT_FOUND", "Medicine listing not found."));
    }

    public UUID upsertCatalog(String key, MedicineRequest request) {
        return jdbc.sql("""
                insert into public.medicine_catalog(normalized_key, generic_name, brand_name, dosage_value, dosage_unit, category, prescription_required)
                values (:key, :generic, :brand, :dosage, :unit, :category, :rx)
                on conflict (normalized_key) do update set normalized_key = excluded.normalized_key
                returning id
                """).param("key", key).param("generic", request.genericName().trim()).param("brand", request.brandName().trim())
                .param("dosage", request.dosageValue()).param("unit", request.dosageUnit()).param("category", request.category().trim())
                .param("rx", request.prescriptionRequired()).query(UUID.class).single();
    }

    public UUID insert(UUID pharmacyId, UUID catalogId, UUID actorId, MedicineRequest request) {
        return jdbc.sql("""
                insert into public.pharmacy_medicines(pharmacy_id, medicine_id, price, stock_status, created_by, updated_by)
                values (:pharmacyId, :catalogId, :price, cast(:status as public.stock_status), :actorId, :actorId)
                returning id
                """).param("pharmacyId", pharmacyId).param("catalogId", catalogId).param("price", request.price())
                .param("status", request.stockStatus().name()).param("actorId", actorId).query(UUID.class).single();
    }

    public int update(UUID pharmacyId, UUID id, UUID catalogId, UUID actorId, MedicineRequest request, long version) {
        return jdbc.sql("""
                update public.pharmacy_medicines set medicine_id=:catalogId, price=:price,
                    stock_status=cast(:status as public.stock_status), updated_by=:actorId, version=version+1
                where pharmacy_id=:pharmacyId and id=:id and active and version=:version
                """).param("catalogId", catalogId).param("price", request.price()).param("status", request.stockStatus().name())
                .param("actorId", actorId).param("pharmacyId", pharmacyId).param("id", id).param("version", version).update();
    }

    public int deactivate(UUID pharmacyId, UUID id, UUID actorId) {
        return jdbc.sql("""
                update public.pharmacy_medicines set active=false, updated_by=:actorId, version=version+1
                where pharmacy_id=:pharmacyId and id=:id and active
                """).param("actorId", actorId).param("pharmacyId", pharmacyId).param("id", id).update();
    }

    public void history(UUID pharmacyId, UUID listingId, UUID actorId, String action, MedicineView before, MedicineView after) {
        jdbc.sql("""
                insert into public.inventory_history(pharmacy_id, listing_id, actor_id, action, before_state, after_state)
                values (:pharmacyId, :listingId, :actorId, :action, cast(:before as jsonb), cast(:after as jsonb))
                """).param("pharmacyId", pharmacyId).param("listingId", listingId).param("actorId", actorId).param("action", action)
                .param("before", JsonSupport.write(before)).param("after", JsonSupport.write(after)).update();
    }

    public void notifyAvailability(UUID pharmacyId, MedicineView medicine) {
        var title = medicine.stockStatus() == StockLevel.OUT_OF_STOCK ? "Medicine marked out of stock" : "Medicine marked low stock";
        jdbc.sql("""
                insert into public.user_notifications(user_id,pharmacy_id,type,title,message)
                select user_id,:pharmacyId,'LOW_STOCK',:title,:message from public.pharmacy_memberships
                where pharmacy_id=:pharmacyId and status='ACTIVE'
                """).param("pharmacyId", pharmacyId).param("title", title)
                .param("message", medicine.brandName() + " " + medicine.dosageValue().stripTrailingZeros().toPlainString() + " " + medicine.dosageUnit() + " needs an availability review.").update();
    }

    private MedicineView map(ResultSet rs, int row) throws SQLException {
        return new MedicineView(rs.getObject("id", UUID.class), rs.getString("generic_name"), rs.getString("brand_name"),
                rs.getBigDecimal("dosage_value"), rs.getString("dosage_unit"), rs.getString("category"), rs.getBigDecimal("price"),
                StockLevel.valueOf(rs.getString("stock_status")), rs.getBoolean("prescription_required"),
                rs.getTimestamp("updated_at").toInstant(), rs.getLong("version"));
    }

    private static String clean(String value) { return value == null ? "" : value.trim(); }

    private static final class JsonSupport {
        private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules();
        static String write(Object value) {
            if (value == null) return null;
            try { return MAPPER.writeValueAsString(value); }
            catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException(error); }
        }
    }
}

