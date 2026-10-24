package care.oath.pharmacy.pharmacy;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.pharmacy.PharmacyModels.ApplicationView;
import care.oath.pharmacy.pharmacy.PharmacyModels.PharmacyIdentity;
import care.oath.pharmacy.pharmacy.PharmacyModels.ProfileRequest;
import care.oath.pharmacy.pharmacy.PharmacyModels.ProfileView;
import care.oath.pharmacy.pharmacy.PharmacyModels.RegistrationRequest;
import care.oath.pharmacy.security.CurrentUser;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PharmacyService {
    private final PharmacyRepository repository;
    private final MembershipService memberships;

    public PharmacyService(PharmacyRepository repository, MembershipService memberships) {
        this.repository = repository;
        this.memberships = memberships;
    }

    public ApplicationView application(CurrentUser user) {
        return repository.application(user.id()).orElse(new ApplicationView(null, "DRAFT", null, null, List.of()));
    }

    @Transactional
    public ApplicationView saveDraft(CurrentUser user, RegistrationRequest request) {
        repository.ensureProfile(user.id(), request.data().pharmacyName());
        var existingPharmacy = repository.pharmacyForUser(user.id());
        final java.util.UUID pharmacyId;
        if (existingPharmacy.isPresent()) {
            var membership = memberships.requireMembership(user, false);
            memberships.requireOwner(membership);
            pharmacyId = membership.pharmacyId();
        } else {
            var id = repository.createPharmacy(request.data());
            repository.createApplication(id, user.id());
            pharmacyId = id;
        }
        if (repository.updateDraft(pharmacyId, user.id(), request.data()) == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "APPLICATION_LOCKED", "Only draft or returned applications can be edited.");
        }
        repository.replaceHours(pharmacyId, request.hours());
        repository.replaceClosures(pharmacyId, request.holidays());
        return application(user);
    }

    @Transactional
    public ApplicationView submit(CurrentUser user, RegistrationRequest request) {
        saveDraft(user, request);
        var pharmacyId = memberships.requireMembership(user, false).pharmacyId();
        if (repository.requiredDocumentCount(pharmacyId) < 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DOCUMENTS_REQUIRED", "Upload all three required verification documents before submission.");
        }
        if (repository.submit(pharmacyId, user.id()) == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INCOMPLETE_APPLICATION", "Complete the required official business details before submission.");
        }
        repository.audit(pharmacyId, user.id(), "APPLICATION_SUBMITTED", "pharmacy_application", application(user).id().toString());
        return application(user);
    }

    public PharmacyIdentity identity(CurrentUser user) {
        var membership = memberships.requireMembership(user, false);
        var initials = membership.pharmacyName().trim().split("\\s+");
        var shortName = String.valueOf(initials[0].charAt(0)) + (initials.length > 1 ? initials[1].charAt(0) : "");
        var verification = membership.verificationStatus().equals("APPROVED") ? "VERIFIED" :
                membership.verificationStatus().equals("NEEDS_CHANGES") ? "NEEDS_UPDATE" : "UNDER_REVIEW";
        return new PharmacyIdentity(membership.pharmacyName(), user.email(), title(membership.role()), shortName.toUpperCase(), verification);
    }

    public ProfileView profile(CurrentUser user) {
        return repository.profile(memberships.requireMembership(user, true).pharmacyId());
    }

    @Transactional
    public ProfileView updateProfile(CurrentUser user, ProfileRequest request) {
        var membership = memberships.requireMembership(user, true);
        memberships.requireManager(membership);
        var before = repository.profile(membership.pharmacyId());
        long version = request.version() == null ? before.version() : request.version();
        if (repository.updateProfile(membership.pharmacyId(), request, version) == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "STALE_PROFILE", "The pharmacy profile changed after you opened it. Refresh and try again.");
        }
        repository.replaceHours(membership.pharmacyId(), request.hours());
        repository.audit(membership.pharmacyId(), user.id(), "PROFILE_UPDATED", "pharmacy", membership.pharmacyId().toString());
        return repository.profile(membership.pharmacyId());
    }

    private static String title(String role) { return role.charAt(0) + role.substring(1).toLowerCase() + " · Pharmacy partner"; }
}

