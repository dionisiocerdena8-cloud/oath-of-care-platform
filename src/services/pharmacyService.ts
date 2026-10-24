import { runtime } from '@/src/config/runtime';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { mockRepository } from '@/src/services/mockRepository';
import type { PharmacyIdentity } from '@/src/types/models';
import type { HolidayException, RegistrationData, UploadState } from '@/src/types/registration';
import type { OperatingDay, PharmacyApplication, PharmacyProfile } from '@/src/types/models';
import { apiRequest, jsonBody } from '@/src/services/apiClient';
import { verificationService } from '@/src/services/verificationService';

type RemoteApplication = Omit<PharmacyApplication, 'status'> & { status: PharmacyApplication['status'] | 'SUBMITTED' };

const DEMO_APPLICATION_KEY = 'ooc-demo-application-state';

function readDemoApplication(): PharmacyApplication | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(DEMO_APPLICATION_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as PharmacyApplication; }
  catch { return null; }
}

export const pharmacyService = {
  async getIdentity(): Promise<PharmacyIdentity | null> {
    if (runtime.useMockData) return mockRepository.getPharmacyIdentity();
    if (!supabase || !isSupabaseConfigured) return null;
    return apiRequest<PharmacyIdentity>('/me/identity');
  },
  async getApplication() {
    if (runtime.useMockData) return readDemoApplication() || mockRepository.getApplication();
    const application = await apiRequest<RemoteApplication>('/applications/current');
    return { ...application, id: application.id || '', status: application.status === 'SUBMITTED' ? 'PENDING' as const : application.status };
  },
  getCachedApplicationStatus() {
    if (!runtime.useMockData) return null;
    return readDemoApplication()?.status || runtime.demoApplicationStatus;
  },
  async saveApplicationDraft(payload: { data: RegistrationData; hours: OperatingDay[]; holidays: HolidayException[] }) {
    if (runtime.useMockData) return { id: '', status: 'DRAFT' as const };
    return apiRequest<PharmacyApplication>('/applications/current/draft', { method: 'PUT', body: jsonBody({ data: publicRegistrationData(payload.data), hours: payload.hours, holidays: payload.holidays }) });
  },
  async submitApplication(payload?: { data: RegistrationData; hours: OperatingDay[]; holidays: HolidayException[]; documents: Record<string, UploadState> }) {
    if (!payload) throw new Error('Application information is missing.');
    if (!runtime.useMockData) {
      await this.saveApplicationDraft(payload);
      const documentTypes: Record<string, 'FDA_LICENSE' | 'BUSINESS_PERMIT' | 'PHARMACIST_PRC_ID'> = {
        fda: 'FDA_LICENSE', permit: 'BUSINESS_PERMIT', prc: 'PHARMACIST_PRC_ID',
      };
      for (const [key, document] of Object.entries(payload.documents)) {
        if (!document.file) throw new Error(`Select ${document.name || key} again before submitting.`);
        await verificationService.upload(documentTypes[key] || key as 'FDA_LICENSE', document.file);
      }
      const application = await apiRequest<RemoteApplication>('/applications/current/submit', { method: 'POST', body: jsonBody({ data: publicRegistrationData(payload.data), hours: payload.hours, holidays: payload.holidays }) });
      return { ok: true, application: { ...application, status: 'PENDING' as const } };
    }
    const application: PharmacyApplication = {
      id: `APP-DEMO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      status: 'PENDING',
      submittedAt: new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()),
    };
    if (typeof window !== 'undefined') window.localStorage.setItem(DEMO_APPLICATION_KEY, JSON.stringify(application));
    return { ok: true, application };
  },
  async getProfile(): Promise<PharmacyProfile | null> {
    if (runtime.useMockData) return null;
    const profile = await apiRequest<PharmacyProfile>('/pharmacy/profile');
    return { ...profile, hours: profile.hours.map((hour) => ({ ...hour, day: hour.day[0] + hour.day.slice(1).toLowerCase() })) };
  },
  async saveProfile(profile?: PharmacyProfile) {
    if (runtime.useMockData) return { ok: true, profile };
    if (!profile) throw new Error('Pharmacy profile is missing.');
    const saved = await apiRequest<PharmacyProfile>('/pharmacy/profile', { method: 'PUT', body: jsonBody(profile) });
    return { ok: true, profile: saved };
  },
  async uploadProfilePhoto(file: File) {
    const form = new FormData(); form.append('file', file);
    return apiRequest<{ logoPath: string; url: string }>('/pharmacy/profile/photo', { method: 'POST', body: form });
  },
  async getProfilePhoto() { return apiRequest<{ url: string }>('/pharmacy/profile/photo'); },
};

function publicRegistrationData(data: RegistrationData) {
  const { password: _password, confirmPassword: _confirmPassword, locationSource: _locationSource,
    locationAccuracy: _locationAccuracy, locationConfirmedAt: _locationConfirmedAt, ...safe } = data;
  void _password; void _confirmPassword; void _locationSource; void _locationAccuracy; void _locationConfirmedAt;
  return safe;
}
