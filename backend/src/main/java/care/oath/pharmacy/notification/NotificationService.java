package care.oath.pharmacy.notification;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private final JdbcClient jdbc;
    public NotificationService(JdbcClient jdbc) { this.jdbc = jdbc; }

    public List<NotificationView> list(CurrentUser user, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        return jdbc.sql("""
                select id,type::text,title,message,created_at,read_at is not null as read
                from public.user_notifications where user_id=:userId order by created_at desc limit :limit
                """).param("userId", user.id()).param("limit", safeLimit).query((rs, row) -> new NotificationView(
                        rs.getObject("id", UUID.class), rs.getString("type"), rs.getString("title"), rs.getString("message"),
                        rs.getTimestamp("created_at").toInstant(), rs.getBoolean("read"))).list();
    }

    public void markRead(CurrentUser user, UUID id) {
        if (jdbc.sql("update public.user_notifications set read_at=coalesce(read_at,now()) where id=:id and user_id=:userId")
                .param("id", id).param("userId", user.id()).update() == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Notification not found.");
        }
    }

    public void markAllRead(CurrentUser user) {
        jdbc.sql("update public.user_notifications set read_at=now() where user_id=:userId and read_at is null").param("userId", user.id()).update();
    }

    public record NotificationView(UUID id, String type, String title, String message, Instant createdAt, boolean read) {}
}

