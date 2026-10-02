import type { ApplicationStatus, StockLevel } from '@/src/types/models';
import { stockLabel } from '@/src/utils/stockLevel';

type Status = StockLevel | ApplicationStatus | 'VERIFIED' | 'UNDER_REVIEW' | 'NEEDS_UPDATE';

export function StatusBadge({ status }: { status: Status }) {
  const text = status.includes('STOCK') || status === 'UNKNOWN'
    ? stockLabel(status as StockLevel)
    : status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
  return <span className={`status-badge status-${status.toLowerCase().replaceAll('_', '-')}`}>{text}</span>;
}

