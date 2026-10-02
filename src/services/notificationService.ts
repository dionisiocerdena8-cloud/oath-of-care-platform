import { runtime } from '@/src/config/runtime';
import { mockRepository } from '@/src/services/mockRepository';

export const notificationService = {
  async list() { return runtime.useMockData ? mockRepository.getNotifications() : []; },
  async markRead(id: string) { if (runtime.useMockData) await mockRepository.markNotificationRead(id); },
};

