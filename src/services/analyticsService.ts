import { runtime } from '@/src/config/runtime';
import type { AnalyticsDataset, AnalyticsPoint, AnalyticsSummary } from '@/src/types/models';
import { apiRequest } from '@/src/services/apiClient';

export type AnalyticsRange = { start: string; end: string };
const MANILA_OFFSET = '+08:00';
const demoPoints: AnalyticsPoint[] = Array.from({ length: 60 }, (_, offset) => {
  const date = new Date(`2026-10-18T12:00:00${MANILA_OFFSET}`);
  date.setDate(date.getDate() - (59 - offset));
  const weekday = date.getDay();
  const rhythm = 58 + ((offset * 17) % 31) + (weekday === 0 ? -14 : weekday === 6 ? -5 : 0);
  return {
    date: date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
    searchAppearances: Math.max(20, rhythm),
    profileViews: Math.max(8, Math.round(rhythm * .34)),
    patientConfirmations: Math.max(2, Math.round(rhythm * .075)),
    outOfStockReports: offset % 11 === 0 ? 2 : offset % 4 === 0 ? 1 : 0,
  };
});

const total = (points: AnalyticsPoint[]): AnalyticsSummary => points.reduce((sum, point) => ({
  searchAppearances: sum.searchAppearances + point.searchAppearances,
  profileViews: sum.profileViews + point.profileViews,
  patientConfirmations: sum.patientConfirmations + point.patientConfirmations,
  outOfStockReports: sum.outOfStockReports + point.outOfStockReports,
}), { searchAppearances: 0, profileViews: 0, patientConfirmations: 0, outOfStockReports: 0 });

export const analyticsService = {
  async getSummary(range?: AnalyticsRange): Promise<AnalyticsDataset> {
    if (!runtime.useMockData) {
      const query = range ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}` : '';
      return apiRequest<AnalyticsDataset>(`/analytics${query}`);
    }
    const end = range?.end ?? '2026-10-18';
    const start = range?.start ?? '2026-09-19';
    const points = demoPoints.filter((point) => point.date >= start && point.date <= end);
    return { summary: total(points), points };
  },
};
