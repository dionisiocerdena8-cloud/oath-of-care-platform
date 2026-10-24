package care.oath.pharmacy.error;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    public record FieldViolation(String field, String message) {}
    public record Problem(Instant timestamp, int status, String code, String message, String path, List<FieldViolation> violations) {}

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Problem> api(ApiException error, HttpServletRequest request) {
        return response(error.status(), error.code(), error.getMessage(), request, List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Problem> invalid(MethodArgumentNotValidException error, HttpServletRequest request) {
        var violations = error.getBindingResult().getFieldErrors().stream()
                .map(item -> new FieldViolation(item.getField(), item.getDefaultMessage())).toList();
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Review the highlighted fields.", request, violations);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Problem> conflict(DataIntegrityViolationException error, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, "CONFLICT", "The record conflicts with existing pharmacy data.", request, List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Problem> denied(AccessDeniedException error, HttpServletRequest request) {
        return response(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have permission to perform this action.", request, List.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Problem> unknown(Exception error, HttpServletRequest request) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "The request could not be completed.", request, List.of());
    }

    private ResponseEntity<Problem> response(HttpStatus status, String code, String message, HttpServletRequest request, List<FieldViolation> violations) {
        return ResponseEntity.status(status).body(new Problem(Instant.now(), status.value(), code, message, request.getRequestURI(), violations));
    }
}

