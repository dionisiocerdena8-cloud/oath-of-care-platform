import type { AnalyticsSummary, Medicine, OperatingDay, PharmacyApplication, PharmacyNotification, VerificationDocument } from '@/src/types/models';

export const mockMedicines: Medicine[] = [
  { id: 'med-1', genericName: 'Paracetamol', brandName: 'Biogesic', dosageValue: 500, dosageUnit: 'mg', category: 'Analgesic', price: 6.5, quantity: 8, stockLevel: 'LOW_STOCK', prescriptionRequired: false, lastUpdated: '2026-10-02T08:12:00Z' },
  { id: 'med-2', genericName: 'Amoxicillin', brandName: 'Amoxil', dosageValue: 500, dosageUnit: 'mg', category: 'Antibiotic', price: 24, quantity: 64, stockLevel: 'HIGH_STOCK', prescriptionRequired: true, lastUpdated: '2026-10-02T07:45:00Z' },
  { id: 'med-3', genericName: 'Losartan', brandName: 'Lifezar', dosageValue: 50, dosageUnit: 'mg', category: 'Antihypertensive', price: 12.75, quantity: 31, stockLevel: 'MEDIUM_STOCK', prescriptionRequired: true, lastUpdated: '2026-10-01T10:20:00Z' },
  { id: 'med-4', genericName: 'Cetirizine', brandName: 'Allerta', dosageValue: 10, dosageUnit: 'mg', category: 'Antihistamine', price: 18.5, quantity: 0, stockLevel: 'OUT_OF_STOCK', prescriptionRequired: false, lastUpdated: '2026-09-30T03:10:00Z' },
  { id: 'med-5', genericName: 'Metformin', brandName: 'Glucophage', dosageValue: 500, dosageUnit: 'mg', category: 'Antidiabetic', price: 9.25, quantity: 42, stockLevel: 'HIGH_STOCK', prescriptionRequired: true, lastUpdated: '2026-09-29T06:30:00Z' },
  { id: 'med-6', genericName: 'Salbutamol', brandName: 'Ventolin', dosageValue: 2, dosageUnit: 'mg', category: 'Respiratory', price: 15.75, quantity: 13, stockLevel: 'LOW_STOCK', prescriptionRequired: true, lastUpdated: '2026-09-28T09:15:00Z' },
  { id: 'med-7', genericName: 'Omeprazole', brandName: 'Losec', dosageValue: 20, dosageUnit: 'mg', category: 'Gastrointestinal', price: 21, quantity: 27, stockLevel: 'MEDIUM_STOCK', prescriptionRequired: true, lastUpdated: '2026-09-27T13:00:00Z' },
  { id: 'med-8', genericName: 'Ascorbic Acid', brandName: 'Poten-Cee', dosageValue: 500, dosageUnit: 'mg', category: 'Vitamins & Supplements', price: 8, quantity: 88, stockLevel: 'HIGH_STOCK', prescriptionRequired: false, lastUpdated: '2026-09-27T09:00:00Z' },
];

export const mockNotifications: PharmacyNotification[] = [
  { id: 'n1', type: 'LOW_STOCK', title: 'Paracetamol 500 mg has reached low stock', message: 'Only 8 units remain. Review your inventory before peak hours.', createdAt: '12 minutes ago', read: false },
  { id: 'n2', type: 'STOCK_ACCURACY', title: 'Patients reported Amoxicillin unavailable', message: 'Three recent patient reports need an inventory review.', createdAt: '1 hour ago', read: false },
  { id: 'n3', type: 'VERIFICATION', title: 'Business Permit needs an updated copy', message: 'The current image is difficult to read. Upload a clearer copy.', createdAt: 'Yesterday', read: false },
  { id: 'n4', type: 'APPLICATION', title: 'Profile verification completed', message: 'Your main pharmacy profile remains verified.', createdAt: 'Sep 28', read: true },
  { id: 'n5', type: 'SUPPORT', title: 'New inventory guide available', message: 'Learn how patient feedback helps keep availability accurate.', createdAt: 'Sep 24', read: true },
];

export const mockDocuments: VerificationDocument[] = [
  { id: 'd1', type: 'FDA_LICENSE', label: 'FDA License to Operate', fileName: 'fda-license-2026.pdf', status: 'VERIFIED', uploadedAt: 'Aug 18, 2026' },
  { id: 'd2', type: 'BUSINESS_PERMIT', label: 'Business Permit', fileName: 'business-permit.jpg', status: 'NEEDS_UPDATE', uploadedAt: 'Aug 18, 2026', adminMessage: 'The permit image is unreadable. Please upload a clearer copy.' },
  { id: 'd3', type: 'PHARMACIST_PRC_ID', label: 'Pharmacist PRC ID', fileName: 'prc-id.pdf', status: 'UNDER_REVIEW', uploadedAt: 'Oct 1, 2026' },
];

export const mockApplication: PharmacyApplication = {
  id: 'APP-2026-0418',
  status: 'UNDER_REVIEW',
  submittedAt: 'September 30, 2026',
};

export const mockAnalytics: AnalyticsSummary = {
  searchAppearances: 2480,
  profileViews: 824,
  directionsStarted: 316,
  patientConfirmations: 187,
  outOfStockReports: 14,
};

export const defaultHours: OperatingDay[] = [
  ...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({ day, isOpen: true, is24Hours: false, open: '08:00', close: '20:00' })),
  { day: 'Saturday', isOpen: true, is24Hours: false, open: '09:00', close: '18:00' },
  { day: 'Sunday', isOpen: false, is24Hours: false, open: '09:00', close: '17:00' },
];

