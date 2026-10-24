package care.oath.pharmacy.pharmacy;

import care.oath.pharmacy.pharmacy.PharmacyModels.ApplicationView;
import care.oath.pharmacy.pharmacy.PharmacyModels.OperatingDay;
import care.oath.pharmacy.pharmacy.PharmacyModels.ProfileView;
import care.oath.pharmacy.pharmacy.PharmacyModels.RegistrationData;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class PharmacyRepository {
    private final JdbcClient jdbc;
    private final ObjectMapper mapper;

    public PharmacyRepository(JdbcClient jdbc, ObjectMapper mapper) { this.jdbc = jdbc; this.mapper = mapper; }

    public Optional<UUID> pharmacyForUser(UUID userId) {
        return jdbc.sql("select pharmacy_id from public.pharmacy_memberships where user_id=:userId and status='ACTIVE' order by created_at limit 1")
                .param("userId", userId).query(UUID.class).optional();
    }

    public void ensureProfile(UUID userId, String displayName) {
        jdbc.sql("insert into public.user_profiles(user_id, display_name) values (:userId, :name) on conflict (user_id) do nothing")
                .param("userId", userId).param("name", displayName).update();
    }

    public UUID createPharmacy(RegistrationData data) {
        return jdbc.sql("""
                insert into public.pharmacies(display_name, contact_email, contact_phone, full_address, latitude, longitude, concise_address)
                values (:name, :email, :phone, :address, :latitude, :longitude, :concise) returning id
                """).param("name", data.pharmacyName().trim()).param("email", blankToNull(data.contactEmail()))
                .param("phone", blankToNull(data.contact())).param("address", blankToNull(data.registeredAddress()))
                .param("latitude", decimal(data.latitude())).param("longitude", decimal(data.longitude()))
                .param("concise", blankToNull(data.conciseAddress())).query(UUID.class).single();
    }

    public UUID createApplication(UUID pharmacyId, UUID userId) {
        jdbc.sql("insert into public.pharmacy_memberships(pharmacy_id,user_id,role) values (:pharmacyId,:userId,'OWNER')")
                .param("pharmacyId", pharmacyId).param("userId", userId).update();
        return jdbc.sql("insert into public.pharmacy_applications(pharmacy_id,created_by) values (:pharmacyId,:userId) returning id")
                .param("pharmacyId", pharmacyId).param("userId", userId).query(UUID.class).single();
    }

    public int updateDraft(UUID pharmacyId, UUID userId, RegistrationData data) {
        jdbc.sql("""
                update public.pharmacies set display_name=:name, contact_email=:email, contact_phone=:phone,
                    full_address=:address, latitude=:latitude, longitude=:longitude, concise_address=:concise, version=version+1
                where id=:pharmacyId
                """).param("name", data.pharmacyName().trim()).param("email", blankToNull(data.contactEmail()))
                .param("phone", blankToNull(data.contact())).param("address", blankToNull(data.registeredAddress()))
                .param("latitude", decimal(data.latitude())).param("longitude", decimal(data.longitude()))
                .param("concise", blankToNull(data.conciseAddress())).param("pharmacyId", pharmacyId).update();
        return jdbc.sql("""
                update public.pharmacy_applications set business_name=:businessName, business_type=:businessType,
                    registration_number=:registrationNo, permit_number=:permitNo, tin=:tin,
                    registered_address=:registeredAddress, contact_person=:contactPerson, version=version+1
                where pharmacy_id=:pharmacyId and created_by=:userId and status in ('DRAFT','NEEDS_CHANGES')
                """).param("businessName", blankToNull(data.businessName())).param("businessType", blankToNull(data.businessType()))
                .param("registrationNo", blankToNull(data.registrationNo())).param("permitNo", blankToNull(data.permitNo()))
                .param("tin", blankToNull(data.tin())).param("registeredAddress", blankToNull(data.registeredAddress()))
                .param("contactPerson", blankToNull(data.contactPerson())).param("pharmacyId", pharmacyId).param("userId", userId).update();
    }

    public void replaceHours(UUID pharmacyId, List<OperatingDay> hours) {
        for (var hour : hours) {
            var day = DayOfWeek.valueOf(hour.day().trim().toUpperCase()).getValue();
            jdbc.sql("""
                    insert into public.pharmacy_operating_hours(pharmacy_id,day_of_week,is_open,is_24_hours,opens_at,closes_at)
                    values (:pharmacyId,:day,:isOpen,:is24,:opens,:closes)
                    on conflict (pharmacy_id,day_of_week) do update set is_open=excluded.is_open,
                      is_24_hours=excluded.is_24_hours, opens_at=excluded.opens_at, closes_at=excluded.closes_at
                    """).param("pharmacyId", pharmacyId).param("day", day).param("isOpen", hour.isOpen())
                    .param("is24", hour.is24Hours()).param("opens", time(hour.open())).param("closes", time(hour.close())).update();
        }
    }

    public void replaceClosures(UUID pharmacyId, List<PharmacyModels.HolidayException> holidays) {
        jdbc.sql("delete from public.pharmacy_closures where pharmacy_id=:pharmacyId and closure_date >= current_date")
                .param("pharmacyId", pharmacyId).update();
        for (var holiday : holidays) {
            jdbc.sql("""
                    insert into public.pharmacy_closures(pharmacy_id,closure_date,is_closed,opens_at,closes_at)
                    values (:pharmacyId,:date,:closed,:opens,:closes)
                    """).param("pharmacyId", pharmacyId).param("date", LocalDate.parse(holiday.date())).param("closed", holiday.isClosed())
                    .param("opens", time(holiday.open())).param("closes", time(holiday.close())).update();
        }
    }

    public Optional<ApplicationView> application(UUID userId) {
        return jdbc.sql("""
                select id,status::text,submitted_at,reviewer_message,requested_changes
                from public.pharmacy_applications where created_by=:userId order by created_at limit 1
                """).param("userId", userId).query((rs, row) -> new ApplicationView(rs.getObject("id", UUID.class), rs.getString("status"),
                        rs.getTimestamp("submitted_at") == null ? null : rs.getTimestamp("submitted_at").toInstant(),
                        rs.getString("reviewer_message"), readStrings(rs.getString("requested_changes")))).optional();
    }

    public int requiredDocumentCount(UUID pharmacyId) {
        return jdbc.sql("select count(distinct document_type) from public.pharmacy_documents where pharmacy_id=:pharmacyId and status <> 'REJECTED'")
                .param("pharmacyId", pharmacyId).query(Integer.class).single();
    }

    public int submit(UUID pharmacyId, UUID userId) {
        int changed = jdbc.sql("""
                update public.pharmacy_applications set status='SUBMITTED',submitted_at=now(),version=version+1
                where pharmacy_id=:pharmacyId and created_by=:userId and status in ('DRAFT','NEEDS_CHANGES')
                  and business_name is not null and registration_number is not null and permit_number is not null
                """).param("pharmacyId", pharmacyId).param("userId", userId).update();
        if (changed > 0) jdbc.sql("""
                insert into public.user_notifications(user_id,pharmacy_id,type,title,message)
                values (:userId,:pharmacyId,'APPLICATION','Application submitted','Your pharmacy application is now queued for administrator review.')
                """).param("userId", userId).param("pharmacyId", pharmacyId).update();
        return changed;
    }

    public ProfileView profile(UUID pharmacyId) {
        var profile = jdbc.sql("""
                select id,display_name,contact_email,contact_phone,full_address,barangay,latitude,longitude,concise_address,logo_path,version
                from public.pharmacies where id=:pharmacyId
                """).param("pharmacyId", pharmacyId).query((rs, row) -> mapProfile(rs, List.of())).single();
        return new ProfileView(profile.id(), profile.pharmacyName(), profile.contactEmail(), profile.contactPhone(), profile.fullAddress(),
                profile.barangay(), profile.latitude(), profile.longitude(), profile.conciseAddress(), profile.logoPath(), profile.version(), hours(pharmacyId));
    }

    public int updateProfile(UUID pharmacyId, PharmacyModels.ProfileRequest request, long version) {
        return jdbc.sql("""
                update public.pharmacies set display_name=:name,contact_email=:email,contact_phone=:phone,
                    full_address=:address,barangay=:barangay,latitude=:latitude,longitude=:longitude,
                    concise_address=:concise,version=version+1 where id=:pharmacyId and version=:version
                """).param("name", request.pharmacyName().trim()).param("email", blankToNull(request.contactEmail()))
                .param("phone", blankToNull(request.contactPhone())).param("address", blankToNull(request.fullAddress()))
                .param("barangay", blankToNull(request.barangay())).param("latitude", request.latitude()).param("longitude", request.longitude())
                .param("concise", blankToNull(request.conciseAddress())).param("pharmacyId", pharmacyId).param("version", version).update();
    }

    public void audit(UUID pharmacyId, UUID actor, String action, String resourceType, String resourceId) {
        jdbc.sql("insert into public.audit_logs(pharmacy_id,actor_id,action,resource_type,resource_id) values (:p,:a,:action,:type,:id)")
                .param("p", pharmacyId).param("a", actor).param("action", action).param("type", resourceType).param("id", resourceId).update();
    }

    private List<OperatingDay> hours(UUID pharmacyId) {
        return jdbc.sql("select day_of_week,is_open,is_24_hours,opens_at,closes_at from public.pharmacy_operating_hours where pharmacy_id=:id order by day_of_week")
                .param("id", pharmacyId).query((rs, row) -> new OperatingDay(DayOfWeek.of(rs.getInt("day_of_week")).name(), rs.getBoolean("is_open"),
                        rs.getBoolean("is_24_hours"), formatTime(rs.getTime("opens_at")), formatTime(rs.getTime("closes_at")))).list();
    }

    private ProfileView mapProfile(ResultSet rs, List<OperatingDay> hours) throws SQLException {
        return new ProfileView(rs.getObject("id", UUID.class), rs.getString("display_name"), rs.getString("contact_email"),
                rs.getString("contact_phone"), rs.getString("full_address"), rs.getString("barangay"), rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"), rs.getString("concise_address"), rs.getString("logo_path"), rs.getLong("version"), hours);
    }

    private List<String> readStrings(String json) {
        try { return mapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception ignored) { return List.of(); }
    }
    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static BigDecimal decimal(String value) { try { return value == null || value.isBlank() ? null : new BigDecimal(value); } catch (NumberFormatException error) { return null; } }
    private static LocalTime time(String value) { return value == null || value.isBlank() ? null : LocalTime.parse(value); }
    private static String formatTime(java.sql.Time value) { return value == null ? "" : value.toLocalTime().toString(); }
}

