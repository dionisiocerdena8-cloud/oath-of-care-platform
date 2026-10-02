import { runtime } from '@/src/config/runtime';
import { mockRepository } from '@/src/services/mockRepository';

export const verificationService = {
  async listDocuments() { return runtime.useMockData ? mockRepository.getDocuments() : []; },
};

