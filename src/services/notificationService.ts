import { runtime } from '@/src/config/runtime';
import { mockRepository } from '@/src/services/mockRepository';
import { apiRequest } from '@/src/services/apiClient';
import type { PharmacyNotification } from '@/src/types/models';

export const notificationService = {
  async list() { return runtime.useMockData ? mockRepository.getNotifications() : apiRequest<PharmacyNotification[]>('/notifications'); },
  async markRead(id: string) { if (runtime.useMockData) await mockRepository.markNotificationRead(id); else await apiRequest<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }); },
  async markAllRead() { if (runtime.useMockData) { const items = await mockRepository.getNotifications(); await Promise.all(items.filter((item) => !item.read).map((item) => mockRepository.markNotificationRead(item.id))); } else await apiRequest<void>('/notifications/read-all', { method: 'PATCH' }); },
};

