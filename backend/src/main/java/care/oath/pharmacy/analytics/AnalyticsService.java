package care.oath.pharmacy.analytics;

import care.oath.pharmacy.error.ApiException;
import care.oath.pharmacy.membership.MembershipService;
import care.oath.pharmacy.security.CurrentUser;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsService {
    private static final ZoneId MANILA = ZoneId.of("Asia/Manila");
    private final JdbcClient jdbc;
    private final MembershipService memberships;

    public AnalyticsService(JdbcClient jdbc, MembershipService memberships) { this.jdbc = jdbc; this.memberships = memberships; }

    public AnalyticsDataset summary(CurrentUser user, LocalDate start, LocalDate end) {
        var today = LocalDate.now(MANILA);
        if (start == null || end == null) { end = today; start = end.minusDays(29); }
        if (start.isAfter(end)) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DATE_RANGE", "Start date cannot be later than end date.");
        if (end.isAfter(today)) throw new ApiException(HttpStatus.BAD_REQUEST, "FUTURE_DATE_RANGE", "Analytics cannot include future dates.");
        if (start.isBefore(end.minusDays(365))) throw new ApiException(HttpStatus.BAD_REQUEST, "DATE_RANGE_TOO_LARGE", "Choose a range of 366 days or fewer.");
        var pharmacyId = memberships.requireMembership(user, true).pharmacyId();
        var from = start.atStartOfDay(MANILA).toInstant();
        var until = end.plusDays(1).atStartOfDay(MANILA).toInstant();
        var points = jdbc.sql("""
                with days as (select generate_series(cast(:start as date),cast(:end as date),'1 day')::date as day),
                totals as (
                  select (occurred_at at time zone 'Asia/Manila')::date day,
                    count(*) filter(where event_type='SEARCH_APPEARANCE') search_appearances,
                    count(*) filter(where event_type='PROFILE_VIEW') profile_views,
                    count(*) filter(where event_type='PATIENT_CONFIRMATION') patient_confirmations,
                    count(*) filter(where event_type='OUT_OF_STOCK_REPORT') out_of_stock_reports
                  from public.analytics_events where pharmacy_id=:pharmacyId and occurred_at>=:from and occurred_at<:until
                  group by 1
                )
                select d.day,coalesce(t.search_appearances,0) search_appearances,coalesce(t.profile_views,0) profile_views,
                  coalesce(t.patient_confirmations,0) patient_confirmations,coalesce(t.out_of_stock_reports,0) out_of_stock_reports
                from days d left join totals t on t.day=d.day order by d.day
                """).param("start", start).param("end", end).param("pharmacyId", pharmacyId).param("from", from).param("until", until)
                .query((rs, row) -> new AnalyticsPoint(rs.getObject("day", LocalDate.class), rs.getLong("search_appearances"),
                        rs.getLong("profile_views"), rs.getLong("patient_confirmations"), rs.getLong("out_of_stock_reports"))).list();
        var summary = points.stream().reduce(new AnalyticsSummary(0,0,0,0), (sum, point) -> new AnalyticsSummary(
                sum.searchAppearances() + point.searchAppearances(), sum.profileViews() + point.profileViews(),
                sum.patientConfirmations() + point.patientConfirmations(), sum.outOfStockReports() + point.outOfStockReports()),
                (a,b) -> new AnalyticsSummary(a.searchAppearances()+b.searchAppearances(),a.profileViews()+b.profileViews(),a.patientConfirmations()+b.patientConfirmations(),a.outOfStockReports()+b.outOfStockReports()));
        return new AnalyticsDataset(summary, points);
    }

    public record AnalyticsSummary(long searchAppearances, long profileViews, long patientConfirmations, long outOfStockReports) {}
    public record AnalyticsPoint(LocalDate date, long searchAppearances, long profileViews, long patientConfirmations, long outOfStockReports) {}
    public record AnalyticsDataset(AnalyticsSummary summary, List<AnalyticsPoint> points) {}
}

