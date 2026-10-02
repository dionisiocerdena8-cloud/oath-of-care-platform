import { ArrowRight, BadgeCheck, BarChart3, Boxes, MapPin, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';
import { runtime } from '@/src/config/runtime';

const metrics = [
  { value: '128', label: 'Medicines tracked', icon: Boxes },
  { value: '94%', label: 'Stock accuracy', icon: BadgeCheck },
  { value: '2.4k', label: 'Search appearances', icon: BarChart3 },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Brand />
        <div className="landing-links"><a href="#platform">Platform</a><a href="#showcase">How it works</a><a href="#trust">Trust & safety</a></div>
        <div className="nav-actions"><Link className="text-link" to="/login">Sign in</Link><Link className="button button-small" to="/register">Register pharmacy <ArrowRight size={16} /></Link></div>
      </nav>

      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow"><ShieldCheck size={15} /> Built for verified pharmacy partners</span>
          <h1>Keep your pharmacy <em>findable</em> when care canâ€™t wait.</h1>
          <p>Manage medicine availability, respond to stock signals, and help nearby patients find the care they needâ€”all from one calm, reliable workspace.</p>
          <div className="hero-actions"><Link className="button" to="/register">Join the network <ArrowRight size={18} /></Link><Link className="button button-secondary" to="/login">Open pharmacy portal</Link></div>
          <div className="trust-row"><span><BadgeCheck size={18} /> Verification-first onboarding</span><span><MapPin size={18} /> Local availability visibility</span></div>
        </div>
        <DashboardPreview />
      </section>

      <section className="proof-strip" id="trust" aria-label="Platform principles">
        <span>One trusted source</span><span>Actual quantity control</span><span>Patient feedback signals</span><span>Private verification documents</span>
      </section>

      <section className="landing-section feature-section" id="platform">
        <div className="section-heading"><span className="eyebrow"><Sparkles size={15} /> Purpose-built operations</span><h2>Fewer blind spots. More useful decisions.</h2><p>Everything your team needs to keep availability accurate and patient trust strong.</p></div>
        <div className="feature-grid">
          <article><span className="feature-number">01</span><Boxes /><h3>Inventory that stays actionable</h3><p>Manage exact quantities, structured dosages, medicine details, and safe bulk imports.</p></article>
          <article><span className="feature-number">02</span><BarChart3 /><h3>Visibility you can understand</h3><p>See searches, profile views, directions, patient confirmations, and stock accuracy trends.</p></article>
          <article><span className="feature-number">03</span><ShieldCheck /><h3>Verification without shortcuts</h3><p>Keep store information separate from private documents and follow every review milestone.</p></article>
        </div>
      </section>

      <section className="landing-section showcase-section" id="showcase">
        <div className="showcase-copy"><span className="eyebrow">Product showcase</span><h2>From shelf update to patient discovery.</h2><p>See how one inventory change becomes a reliable availability signal across the care network.</p><Link to="/register" className="inline-link">Start pharmacy onboarding <ArrowRight size={17} /></Link></div>
        <div className="video-slot">
          {runtime.showcaseVideoUrl ? <video controls src={runtime.showcaseVideoUrl} /> : <div className="video-fallback"><span className="play-orb"><Play fill="currentColor" /></span><strong>Showcase video coming soon</strong><p>The final client video can be added through one environment settingâ€”no redesign required.</p></div>}
        </div>
      </section>

      <section className="cta-panel"><div><span className="eyebrow">Ready when your pharmacy is</span><h2>Build a more dependable medicine network.</h2></div><Link className="button button-light" to="/register">Create pharmacy account <ArrowRight size={18} /></Link></section>
      <footer className="landing-footer"><Brand /><p>Pharmacy tools for trusted medicine availability.</p><span>Â© 2026. Privacy-first by design.</span></footer>
    </main>
  );
}

function DashboardPreview() {
  return (
    <div className="hero-product" aria-label="Pharmacy dashboard preview">
      <div className="product-topbar"><span className="product-logo">+</span><span>Good morning, St. Martha Pharmacy</span><span className="live-pill">Live inventory</span></div>
      <div className="product-body">
        <div className="attention-card"><span className="mini-label">Needs attention</span><strong>8 medicines are running low</strong><p>Restock the items patients are searching for most.</p><span className="fake-link">Review inventory <ArrowRight size={15} /></span></div>
        <div className="metric-grid">{metrics.map(({ value, label, icon: Icon }) => <article key={label} className="metric-card"><Icon size={19} /><strong>{value}</strong><span>{label}</span></article>)}</div>
        <div className="activity-card">
          <div><span className="status-dot low" /><b>Paracetamol 500 mg</b><small>Low stock Â· 8 remaining</small></div>
          <div><span className="status-dot high" /><b>Amoxicillin 500 mg</b><small>Stock confirmed today</small></div>
          <div><span className="status-dot medium" /><b>Losartan 50 mg</b><small>Patient report needs review</small></div>
        </div>
      </div>
    </div>
  );
}


