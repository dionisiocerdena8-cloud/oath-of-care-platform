import { defaultHours } from '@/src/data/mockData';
import type { HolidayException, RegistrationData, RegistrationDraft, UploadState } from '@/src/types/registration';

export const REGISTRATION_DRAFT_KEY = 'ooc-pharmacy-registration-v3';
const LEGACY_KEYS = ['ooc-pharmacy-registration-v2', 'ooc-pharmacy-registration', 'ooc-registration-draft'];

export const emptyRegistrationData: RegistrationData = {
  email: '', password: '', confirmPassword: '', pharmacyName: '', contact: '', contactEmail: '',
  businessName: '', businessType: '', registrationNo: '', permitNo: '', tin: '', registeredAddress: '',
  contactPerson: '', latitude: '', longitude: '', conciseAddress: '', locationSource: '',
  locationAccuracy: null, locationConfirmedAt: '',
};

const cleanDocument = (document: Partial<UploadState>): UploadState => ({
  name: document.name || '',
  size: document.size || '',
  sizeBytes: document.sizeBytes || 0,
  type: document.type || 'Document',
  url: '',
  progress: 0,
  status: 'reselection-required',
  quality: document.quality,
  extractionStatus: document.extractionStatus || 'not-configured',
  extractedFields: document.extractedFields,
});

function migrate(raw: Record<string, unknown>): RegistrationDraft {
  const legacyData = (raw.data || raw) as Record<string, unknown>;
  const oldStep = Number(raw.step || 0);
  const migratedStep = raw.version === 3 ? Math.min(Math.max(oldStep, 0), 5) : oldStep <= 1 ? oldStep : oldStep === 2 ? 2 : Math.min(oldStep - 1, 5);
  const data: RegistrationData = {
    ...emptyRegistrationData,
    ...legacyData,
    contactPerson: String(legacyData.contactPerson || legacyData.ownerName || ''),
    registeredAddress: String(legacyData.registeredAddress || legacyData.address || ''),
    conciseAddress: String(legacyData.conciseAddress || legacyData.address || ''),
    locationSource: (legacyData.locationSource === 'gps' || legacyData.locationSource === 'manual') ? legacyData.locationSource : '',
    locationAccuracy: typeof legacyData.locationAccuracy === 'number' ? legacyData.locationAccuracy : null,
    password: '',
    confirmPassword: '',
  };
  const rawDocuments = (raw.documents || {}) as Record<string, Partial<UploadState>>;
  const documents = Object.fromEntries(Object.entries(rawDocuments).map(([key, value]) => [key, cleanDocument(value)]));
  return {
    version: 3,
    step: migratedStep,
    data,
    hours: Array.isArray(raw.hours) ? raw.hours as RegistrationDraft['hours'] : structuredClone(defaultHours),
    holidays: Array.isArray(raw.holidays) ? raw.holidays as HolidayException[] : [],
    documents,
    photo: null,
    savedAt: new Date().toISOString(),
  };
}

export function loadRegistrationDraft(): RegistrationDraft | null {
  if (typeof window === 'undefined') return null;
  for (const key of [REGISTRATION_DRAFT_KEY, ...LEGACY_KEYS]) {
    const stored = window.localStorage.getItem(key);
    if (!stored) continue;
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      const draft = migrate(parsed);
      if (key !== REGISTRATION_DRAFT_KEY) window.localStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(draft));
      return draft;
    } catch {
      continue;
    }
  }
  return null;
}

export function saveRegistrationDraft(draft: Omit<RegistrationDraft, 'version' | 'savedAt'>) {
  if (typeof window === 'undefined') return;
  const safeDocuments = Object.fromEntries(Object.entries(draft.documents).map(([key, document]) => {
    const { file: _file, ...serializable } = document;
    void _file;
    return [key, { ...serializable, url: '', progress: document.url ? 100 : 0, status: document.url ? document.status : 'reselection-required' }];
  }));
  window.localStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify({
    ...draft,
    version: 3,
    savedAt: new Date().toISOString(),
    data: { ...draft.data, password: '', confirmPassword: '' },
    documents: safeDocuments,
    photo: draft.photo ? { ...draft.photo, url: '' } : null,
  }));
}

export function clearRegistrationDraft() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(REGISTRATION_DRAFT_KEY);
}
