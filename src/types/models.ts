import type { DosageUnit } from '@/src/constants/data';

export type StockLevel = 'HIGH_STOCK' | 'MEDIUM_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
export type ApplicationStatus = 'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface Medicine {
  id: string;
  genericName: string;
  brandName: string;
  dosageValue: number;
  dosageUnit: DosageUnit;
  category: string;
  price: number;
  quantity: number;
  stockLevel?: StockLevel;
  prescriptionRequired: boolean;
  lastUpdated: string;
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
  adminMessage?: string;
}

export interface PharmacyNotification {
  id: string;
  type: 'LOW_STOCK' | 'STOCK_ACCURACY' | 'VERIFICATION' | 'APPLICATION' | 'SUPPORT';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AnalyticsSummary {
  searchAppearances: number;
  profileViews: number;
  directionsStarted: number;
  patientConfirmations: number;
  outOfStockReports: number;
}

