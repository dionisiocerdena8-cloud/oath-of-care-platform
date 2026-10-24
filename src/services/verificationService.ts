import { runtime } from '@/src/config/runtime';
import { mockRepository } from '@/src/services/mockRepository';
import { apiRequest } from '@/src/services/apiClient';
import type { VerificationDocument } from '@/src/types/models';

export const verificationService = {
  async listDocuments() { return runtime.useMockData ? mockRepository.getDocuments() : apiRequest<VerificationDocument[]>('/documents'); },
  async upload(type: VerificationDocument['type'], file: File) {
    const form = new FormData(); form.append('file', file);
    return apiRequest<VerificationDocument>(`/documents/${type}`, { method: 'POST', body: form });
  },
  async preview(id: string) { return apiRequest<{ url: string }>(`/documents/${encodeURIComponent(id)}/signed-url`, { method: 'POST' }); },
};

