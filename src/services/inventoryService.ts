import { runtime } from '@/src/config/runtime';
import { mockRepository } from '@/src/services/mockRepository';
import type { Medicine } from '@/src/types/models';

export interface InventoryService {
  list(): Promise<Medicine[]>;
  save(medicine: Medicine): Promise<Medicine>;
  remove(id: string): Promise<void>;
}

export const inventoryService: InventoryService = {
  async list() {
    if (runtime.useMockData) return mockRepository.listMedicines();
    return [];
  },
  async save(medicine) {
    if (runtime.useMockData) return mockRepository.saveMedicine(medicine);
    throw new Error('Supabase inventory persistence is not configured.');
  },
  async remove(id) {
    if (runtime.useMockData) return mockRepository.deleteMedicine(id);
    throw new Error('Supabase inventory persistence is not configured.');
  },
};

