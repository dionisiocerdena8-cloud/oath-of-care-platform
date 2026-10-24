'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { assets } from '@/src/config/assets';
import { brand } from '@/src/config/brand';

export function LogoReveal() {
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && window.sessionStorage.getItem('ooc-brand-reveal') !== 'seen');

  useEffect(() => {
    if (!visible) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      setVisible(false);
      window.sessionStorage.setItem('ooc-brand-reveal', 'seen');
    }, reduced ? 250 : 1850);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="logo-reveal" role="status" aria-label="Opening Oath of Care">
      <button type="button" onClick={() => setVisible(false)}>Skip intro</button>
      <div className="ribbon-stage">
        <span className="ribbon-trace" aria-hidden="true" />
        <img src={assets.ribbon} alt="" />
        <div><strong>Oath of Care</strong><small>{brand.tagline}</small></div>
      </div>
    </div>
  );
}
