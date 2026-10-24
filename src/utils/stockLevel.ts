import type { StockLevel } from '@/src/types/models';

export function stockLabel(level: StockLevel): string {
  return {
    HIGH_STOCK: 'High stock',
    MEDIUM_STOCK: 'Medium stock',
    LOW_STOCK: 'Low stock',
    OUT_OF_STOCK: 'Out of stock',
  }[level];
}
