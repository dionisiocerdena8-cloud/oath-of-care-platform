import type { DosageUnit } from '@/src/constants/data';

export type StockLevel = 'HIGH_STOCK' | 'MEDIUM_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type ApplicationStatus = 'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface PharmacyIdentity {
  pharmacyName: string;
  email: string;
  role: string;
  initials: string;
  verificationStatus: 'VERIFIED' | 'UNDER_REVIEW' | 'NEEDS_UPDATE' | 'UNKNOWN';
}

export interface Medicine {
  id: string;
  genericName: string;
  brandName: string;
  dosageValue: number;
  dosageUnit: DosageUnit;
  category: string;
  price: number;
  stockStatus: StockLevel;
  prescriptionRequired: boolean;
  lastUpdated: string;
  version?: number;
}

export interface PharmacyApplication {
  id: string;
  status: ApplicationStatus;
  submittedAt?: string;
  reviewerMessage?: string;
  requestedChanges?: string[];
}

export interface OperatingDay {
  day: string;
  isOpen: boolean;
  is24Hours: boolean;
  open: string;
  close: string;
}

export interface VerificationDocument {
  id: string;
  type: 'FDA_LICENSE' | 'BUSINESS_PERMIT' | 'PHARMACIST_PRC_ID';
  label: string;
  fileName: string;
  status: 'VERIFIED' | 'UNDER_REVIEW' | 'NEEDS_UPDATE';
  uploadedAt: string;
  expiresAt?: string;
  adminMessage?: string;
}

export interface PharmacyNotification {
  id: string;
  type: 'LOW_STOCK' | 'STOCK_ACCURACY' | 'VERIFICATION' | 'APPLICATION' | 'SUPPORT' | 'SECURITY';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AnalyticsSummary {
  searchAppearances: number;
  profileViews: number;
  patientConfirmations: number;
  outOfStockReports: number;
}

export interface AnalyticsPoint extends AnalyticsSummary {
  date: string;
}

export interface AnalyticsDataset {
  summary: AnalyticsSummary;
  points: AnalyticsPoint[];
}

export interface PharmacyProfile {
  id: string;
  pharmacyName: string;
  contactEmail: string;
  contactPhone: string;
  fullAddress: string;
  barangay: string;
  latitude: number | null;
  longitude: number | null;
  conciseAddress: string;
  logoPath?: string;
  version: number;
  hours: OperatingDay[];
}
