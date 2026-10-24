import type { OperatingDay } from '@/src/types/models';

export type LocationSource = 'gps' | 'manual' | '';
export type DocumentStatus = 'checking' | 'quality-complete' | 'needs-clearer-image' | 'reselection-required';

export interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  pharmacyName: string;
  contact: string;
  contactEmail: string;
  businessName: string;
  businessType: string;
  registrationNo: string;
  permitNo: string;
  tin: string;
  registeredAddress: string;
  contactPerson: string;
  latitude: string;
  longitude: string;
  conciseAddress: string;
  locationSource: LocationSource;
  locationAccuracy: number | null;
  locationConfirmedAt: string;
}

export interface HolidayException {
  id: string;
  date: string;
  isClosed: boolean;
  open: string;
  close: string;
}

export interface ImageQualityResult {
  width: number;
  height: number;
  brightness: number;
  sharpness: number;
  warnings: string[];
}

export interface UploadState {
  name: string;
  size: string;
  sizeBytes: number;
  type: string;
  url: string;
  progress: number;
  status: DocumentStatus;
  quality?: ImageQualityResult;
  extractionStatus: 'not-configured' | 'not-applicable' | 'information-extracted';
  extractedFields?: Partial<RegistrationData>;
  /** Kept in memory only; registrationDraft deliberately never serializes this value. */
  file?: File;
}

export interface PharmacyPhotoState {
  name: string;
  url: string;
  type: string;
  sizeBytes: number;
}

export interface RegistrationDraft {
  version: 3;
  step: number;
  data: RegistrationData;
  hours: OperatingDay[];
  holidays: HolidayException[];
  documents: Record<string, UploadState>;
  photo: PharmacyPhotoState | null;
  savedAt: string;
}
