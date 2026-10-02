import { runtime } from '@/src/config/runtime';
import { mockRepository } from '@/src/services/mockRepository';

export const pharmacyService = {
  async getApplication() {
    if (runtime.useMockData) return mockRepository.getApplication();
    return { id: '', status: 'DRAFT' as const };
  },
  async submitApplication() {
    if (!runtime.useMockData) throw new Error('Application submission requires configured Supabase services.');
    return { ok: true };
  },
  async saveProfile() {
    if (!runtime.useMockData) throw new Error('Profile persistence requires configured Supabase services.');
    return { ok: true };
  },
};

