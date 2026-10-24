package care.oath.pharmacy.inventory;

import care.oath.pharmacy.inventory.InventoryModels.MedicineRequest;
import care.oath.pharmacy.inventory.InventoryModels.MedicineView;
import care.oath.pharmacy.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
    private final InventoryService service;
    public InventoryController(InventoryService service) { this.service = service; }

    @GetMapping
    List<MedicineView> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String status, @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "name") String sort) {
        return service.list(CurrentUser.from(jwt), search, status, category, sort);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    MedicineView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MedicineRequest request) {
        return service.create(CurrentUser.from(jwt), request, "CREATED");
    }

    @PutMapping("/{id}")
    MedicineView update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody MedicineRequest request) {
        return service.update(CurrentUser.from(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { service.remove(CurrentUser.from(jwt), id); }

    @PostMapping("/imports")
    List<MedicineView> importRows(@AuthenticationPrincipal Jwt jwt, @RequestBody List<@Valid MedicineRequest> rows) {
        return service.importRows(CurrentUser.from(jwt), rows);
    }
}

