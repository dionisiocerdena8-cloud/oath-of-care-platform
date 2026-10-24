/* eslint-disable @next/next/no-img-element */
import { ArrowLeft, BadgeCheck, ShieldCheck, Users } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';
import { assets } from '@/src/config/assets';

export function AuthLayout() {
  const { pathname } = useLocation();
  const isRegistration = pathname === '/register';
  return (
    <main className={`auth-page ${isRegistration ? 'onboarding-page' : ''}`}>
      <section className="auth-story" aria-label="Oath of Care product overview">
        <img className="auth-pharmacy-background" src={assets.warmPharmacyInterior} alt="" />
        <div className="auth-story-top"><Brand />{!isRegistration && <Link to="/" className="back-link"><ArrowLeft size={16} /> Back</Link>}</div>
        <div className="auth-faro"><img src={assets.faroHero} alt="FARO welcoming pharmacy partners" /></div>
        <div className="auth-story-copy"><span className="partner-pill">Pharmacy partner access</span><h1>Care begins with a pharmacy people can find.</h1><p>Set up accurate location, hours, and credentials in one focused application.</p></div>
        <div className="auth-benefits"><span><Users /> Community reach</span><span><BadgeCheck /> Admin-reviewed credentials</span><span><ShieldCheck /> Private documents</span></div>
      </section>
      <section className="auth-form-side"><div className="auth-mobile-header"><Brand />{!isRegistration && <Link to="/" className="back-link"><ArrowLeft size={16} /> Back</Link>}</div><Outlet /></section>
    </main>
  );
}
