export const DOSAGE_UNITS = ['mg', 'g', 'mcg', 'mL', 'L', 'IU'] as const;
export type DosageUnit = (typeof DOSAGE_UNITS)[number];

export const BARANGAYS = [
  'Bangkal', 'Baraka', 'Bigte', 'Bitungol', 'Friendship Village Resources',
  'Matictic', 'Minuyan', 'Partida', 'Pinagtulayan', 'Poblacion',
  'San Lorenzo', 'San Mateo', 'Tigbe',
] as const;

export const MEDICINE_CATEGORIES = [
  'Analgesic', 'Antibiotic', 'Antihypertensive', 'Antihistamine',
  'Antidiabetic', 'Respiratory', 'Gastrointestinal', 'Vitamins & Supplements', 'Other',
] as const;

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

