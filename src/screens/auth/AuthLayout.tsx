import { ArrowLeft, Check, MapPin, Search } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';

const availability = [42, 68, 54, 82, 61, 91, 74, 86, 58, 77, 94, 70];

export function AuthLayout() {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Oath of Care product overview">
        <div className="auth-story-top"><Brand /><Link to="/" className="back-link"><ArrowLeft size={16} /> Back to site</Link></div>
        <div className="availability-visual" aria-hidden="true">
          <div className="availability-grid" />
          <div className="availability-orbit orbit-one" />
          <div className="availability-orbit orbit-two" />
          <div className="availability-bars">{availability.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }} />)}</div>
          <div className="availability-path"><span><Search size={17} /></span><b /><span><Check size={17} /></span><b /><span><MapPin size={17} /></span></div>
        </div>
        <div className="auth-story-copy"><span className="eyebrow">Verified pharmacy network</span><h1>Availability,<br /><em>made dependable.</em></h1><p>One accurate update helps nearby patients find the medicine they need with less uncertainty.</p></div>
        <div className="auth-story-signal"><span /> Live availability signal</div>
      </section>
      <section className="auth-form-side"><div className="auth-mobile-header"><Brand /><Link to="/" className="back-link"><ArrowLeft size={16} /> Back to site</Link></div><Outlet /></section>
    </main>
  );
}

