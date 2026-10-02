import { ArrowLeft, BadgeCheck, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';

export function AuthLayout() {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story-top"><Brand /><Link to="/" className="back-link"><ArrowLeft size={16} /> Back to website</Link></div>
        <div className="auth-story-copy"><span className="eyebrow">Pharmacy partner portal</span><h1>Availability people can <em>trust.</em></h1><p>Keep your pharmacy visible with verified information, accurate inventory, and a clear review process.</p>
          <div className="auth-points"><span><BadgeCheck /> Verified partner identity</span><span><MapPin /> Patient-ready store profile</span><span><LockKeyhole /> Private document handling</span></div>
        </div>
        <div className="auth-quote"><ShieldCheck size={22} /><p>â€œEvery accurate update helps a patient make one less uncertain trip.â€</p></div>
      </section>
      <section className="auth-form-side"><div className="auth-mobile-brand"><Brand /></div><Outlet /></section>
    </main>
  );
}


