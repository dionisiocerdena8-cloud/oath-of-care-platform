import { Link } from 'react-router-dom';
import { brand } from '@/src/config/brand';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand-compact' : ''}`} aria-label={`${brand.productName} home`}>
      <span className="brand-mark" aria-hidden="true">+</span>
      {!compact && <span>{brand.productName}<small>{brand.pharmacyLabel}</small></span>}
    </Link>
  );
}

