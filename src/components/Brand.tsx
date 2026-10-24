/* eslint-disable @next/next/no-img-element */
import { Link } from 'react-router-dom';
import { assets } from '@/src/config/assets';
import { brand } from '@/src/config/brand';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand-compact' : ''}`} aria-label={`${brand.productName} home`}>
      <img className="brand-mark" src={assets.ribbon} alt="" aria-hidden="true" />
      {!compact && <span>{brand.productName}<small>{brand.pharmacyLabel}</small></span>}
    </Link>
  );
}
