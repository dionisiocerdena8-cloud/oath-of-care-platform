import { MOBILE_STOCK_POLICY } from '@/src/constants/stock';
import type { StockLevel } from '@/src/types/models';

export function resolveStockLevel(quantity: number, backendLevel?: StockLevel): StockLevel {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  return backendLevel ?? 'UNKNOWN';
}

export function stockLabel(level: StockLevel) {
  return {
    HIGH_STOCK: 'High stock',
    MEDIUM_STOCK: 'Medium stock',
    LOW_STOCK: 'Low stock',
    OUT_OF_STOCK: 'Out of stock',
    UNKNOWN: 'Awaiting rule',
  }[level];
}

export function stockPolicySummary() {
  return MOBILE_STOCK_POLICY;
}

