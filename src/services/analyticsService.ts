import { runtime } from '@/src/config/runtime';
import { mockRepository } from '@/src/services/mockRepository';

export const analyticsService = {
  async getSummary() {
    if (runtime.useMockData) return mockRepository.getAnalytics();
    return { searchAppearances: 0, profileViews: 0, directionsStarted: 0, patientConfirmations: 0, outOfStockReports: 0 };
  },
};

