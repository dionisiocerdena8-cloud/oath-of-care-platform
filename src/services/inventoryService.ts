import { runtime } from '@/src/config/runtime';
import { mockRepository } from '@/src/services/mockRepository';
import type { Medicine } from '@/src/types/models';
import { apiRequest, jsonBody } from '@/src/services/apiClient';

export interface InventoryService {
  list(): Promise<Medicine[]>;
  save(medicine: Medicine): Promise<Medicine>;
  remove(id: string): Promise<void>;
  importMany(medicines: Medicine[]): Promise<Medicine[]>;
}

export const inventoryService: InventoryService = {
  async list() {
    if (runtime.useMockData) return mockRepository.listMedicines();
    return apiRequest<Medicine[]>('/inventory');
  },
  async save(medicine) {
    if (runtime.useMockData) return mockRepository.saveMedicine(medicine);
    const body = jsonBody({ ...medicine, id: undefined, lastUpdated: undefined });
    return medicine.id
      ? apiRequest<Medicine>(`/inventory/${encodeURIComponent(medicine.id)}`, { method: 'PUT', body })
      : apiRequest<Medicine>('/inventory', { method: 'POST', body });
  },
  async remove(id) {
    if (runtime.useMockData) return mockRepository.deleteMedicine(id);
    await apiRequest<void>(`/inventory/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async importMany(medicines) {
    if (runtime.useMockData) return Promise.all(medicines.map((medicine) => mockRepository.saveMedicine(medicine)));
    return apiRequest<Medicine[]>('/inventory/imports', { method: 'POST', body: jsonBody(medicines.map((medicine) => ({
      genericName: medicine.genericName, brandName: medicine.brandName, dosageValue: medicine.dosageValue,
      dosageUnit: medicine.dosageUnit, category: medicine.category, price: medicine.price,
      stockStatus: medicine.stockStatus, prescriptionRequired: medicine.prescriptionRequired,
    }))) });
  },
};

