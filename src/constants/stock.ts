import type { StockLevel } from '@/src/types/models';

export const STOCK_LEVELS: { value: StockLevel; label: string }[] = [
  { value: 'HIGH_STOCK', label: 'High stock' },
  { value: 'MEDIUM_STOCK', label: 'Medium stock' },
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
];
