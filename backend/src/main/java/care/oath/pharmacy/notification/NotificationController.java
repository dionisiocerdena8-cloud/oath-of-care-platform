package care.oath.pharmacy.notification;

import care.oath.pharmacy.security.CurrentUser;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;
    public NotificationController(NotificationService service) { this.service = service; }
    @GetMapping List<NotificationService.NotificationView> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "50") int limit) { return service.list(CurrentUser.from(jwt), limit); }
    @PatchMapping("/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT) void read(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { service.markRead(CurrentUser.from(jwt), id); }
    @PatchMapping("/read-all") @ResponseStatus(HttpStatus.NO_CONTENT) void readAll(@AuthenticationPrincipal Jwt jwt) { service.markAllRead(CurrentUser.from(jwt)); }
}

