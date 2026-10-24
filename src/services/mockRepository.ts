import { mockApplication, mockDocuments, mockMedicines, mockNotifications, mockPharmacyIdentity } from '@/src/data/mockData';
import type { Medicine, PharmacyApplication, PharmacyNotification, VerificationDocument } from '@/src/types/models';

let inventory: Medicine[] = structuredClone(mockMedicines);
let notifications: PharmacyNotification[] = structuredClone(mockNotifications);
const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockRepository = {
  async listMedicines() { await wait(); return structuredClone(inventory); },
  async saveMedicine(input: Medicine) {
    await wait();
    const index = inventory.findIndex((item) => item.id === input.id);
    if (index >= 0) inventory[index] = { ...input, lastUpdated: new Date().toISOString() };
    else inventory.unshift({ ...input, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, lastUpdated: new Date().toISOString() });
    return structuredClone(index >= 0 ? inventory[index] : inventory[0]);
  },
  async deleteMedicine(id: string) { await wait(); inventory = inventory.filter((item) => item.id !== id); },
  async getApplication(): Promise<PharmacyApplication> { await wait(); return structuredClone(mockApplication); },
  async getPharmacyIdentity() { await wait(80); return structuredClone(mockPharmacyIdentity); },
  async getNotifications() { await wait(); return structuredClone(notifications); },
  async markNotificationRead(id: string) { await wait(80); notifications = notifications.map((item) => item.id === id ? { ...item, read: true } : item); },
  async getDocuments(): Promise<VerificationDocument[]> { await wait(); return structuredClone(mockDocuments); },
};
