import { AlertTriangle, Check, Clock3, Minus, RotateCcw, X } from 'lucide-react';
import type { ApplicationStatus, StockLevel } from '@/src/types/models';
import { StockStatus } from '@/src/components/ui/StockStatus';

type Status = StockLevel | ApplicationStatus | 'VERIFIED' | 'UNDER_REVIEW' | 'NEEDS_UPDATE';

export function StatusBadge({ status }: { status: Status }) {
  if (status.includes('STOCK')) return <StockStatus status={status as StockLevel} />;
  const text = status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
  const Icon = status === 'HIGH_STOCK' || status === 'APPROVED' || status === 'VERIFIED'
    ? Check
    : status === 'MEDIUM_STOCK' || status === 'PENDING' || status === 'UNDER_REVIEW'
      ? Clock3
      : status === 'LOW_STOCK' || status === 'NEEDS_CHANGES' || status === 'NEEDS_UPDATE'
        ? AlertTriangle
        : status === 'OUT_OF_STOCK' || status === 'REJECTED' || status === 'SUSPENDED'
          ? X
          : status === 'DRAFT' ? RotateCcw : Minus;
  return <span className={`status-badge status-${status.toLowerCase().replaceAll('_', '-')}`}><Icon size={12} aria-hidden="true" />{text}</span>;
}
