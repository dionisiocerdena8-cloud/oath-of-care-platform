import { AlertCircle, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import type { StockLevel } from '@/src/types/models';
import { stockLabel } from '@/src/utils/stockLevel';

const icons = {
  HIGH_STOCK: CheckCircle2,
  MEDIUM_STOCK: Clock3,
  LOW_STOCK: AlertCircle,
  OUT_OF_STOCK: XCircle,
} satisfies Record<StockLevel, typeof CheckCircle2>;

export function StockStatus({ status }: { status: StockLevel }) {
  const Icon = icons[status];
  const label = stockLabel(status);
  return (
    <span className={`stock-status stock-${status.toLowerCase().replaceAll('_', '-')}`} aria-label={`Availability: ${label}`}>
      <Icon size={14} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
