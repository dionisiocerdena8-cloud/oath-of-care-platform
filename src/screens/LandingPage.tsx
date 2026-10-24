/* eslint-disable @next/next/no-img-element */
import { ArrowRight, BadgeCheck, BarChart3, Clock3, MapPin, Menu, PackageCheck, Search, ShieldCheck } from 'lucide-react';
import { type PointerEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';
import { assets } from '@/src/config/assets';

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const moveHero = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--hero-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 2}`);
    event.currentTarget.style.setProperty('--hero-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 2}`);
  };
  const resetHero = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--hero-x', '0');
    event.currentTarget.style.setProperty('--hero-y', '0');
  };
  return (
    <main className="landing-page premium-landing">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Brand />
        <div className={`landing-links ${menuOpen ? 'open' : ''}`}><a href="#why">For pharmacies</a><a href="#flow">How it works</a><a href="#trust">Trust</a><a href="#footer">Help</a></div>
        <div className="nav-actions"><Link className="text-link" to="/login">Sign in</Link><Link className="button button-small" to="/register">Join as a pharmacy <ArrowRight size={16} /></Link><button className="landing-menu" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><Menu /></button></div>
      </nav>

      <section className="hero-shell care-hero">
        <div className="hero-copy">
          <span className="partner-pill">Pharmacy partner network</span>
          <h1>Make your pharmacy easier to find when care matters.</h1>
          <p>Keep medicine availability clear, maintain a trusted pharmacy profile, and help people nearby find the care they need with less uncertainty.</p>
          <div className="hero-actions"><Link className="button" to="/register">Join as a pharmacy <ArrowRight size={18} /></Link><a className="button button-secondary" href="#flow">See how it works</a></div>
          <div className="trust-row"><span><BadgeCheck /> Verification-led onboarding</span><span><Clock3 /> Availability, not quantities</span></div>
        </div>
        <div className="hero-art" aria-label="FARO, the Oath of Care pharmacy partner guide" onPointerMove={moveHero} onPointerLeave={resetHero}>
          <img className="hero-pharmacy-bg" src={assets.pharmacyInterior} alt="" aria-hidden="true" />
          <span className="hero-orbit orbit-a" /><span className="hero-orbit orbit-b" />
          <img className="hero-device" src={assets.dashboardDevice} alt="Preview of the pharmacy partner dashboard" />
          <img className="hero-faro" src={assets.faroHero} alt="FARO, Oath of Care pharmacy partner guide" />
        </div>
      </section>

      <section className="care-value-band" id="why">
        <article><span><Search /></span><div><strong>Get discovered</strong><p>Appear when patients search for nearby medicines.</p></div></article>
        <article><span><PackageCheck /></span><div><strong>Manage availability</strong><p>Use four clear stock states—never quantity counters.</p></div></article>
        <article><span><BarChart3 /></span><div><strong>See your impact</strong><p>Understand supported search and profile activity.</p></div></article>
        <article><span><ShieldCheck /></span><div><strong>Build trust</strong><p>Keep permits and credentials ready for review.</p></div></article>
      </section>

      <section className="discovery-story" id="flow">
        <div className="story-visual"><img src={assets.pharmacyMap} alt="Illustration of a pharmacy appearing in a nearby map search" /></div>
        <div className="story-copy"><span className="section-kicker">From shelf to search</span><h2>One clear update travels further.</h2><p>Choose the medicine’s current availability. Oath of Care uses that signal to help people understand where to look—without exposing stock quantities.</p><ol><li><span>1</span><div><strong>List the medicine</strong><p>Add the correct name, strength, form, and price.</p></div></li><li><span>2</span><div><strong>Set availability</strong><p>High, medium, low, or out of stock.</p></div></li><li><span>3</span><div><strong>Keep it current</strong><p>Refresh changes from the pharmacy workspace.</p></div></li></ol></div>
      </section>

      <section className="availability-story">
        <div><span className="section-kicker">A calmer workflow</span><h2>Built around the decision your team actually makes.</h2><p>No restock math and no quantity steppers. The workspace keeps the daily task focused on a truthful availability status.</p><Link to="/register" className="inline-link">Start pharmacy onboarding <ArrowRight /></Link></div>
        <img src={assets.availabilityCard} alt="Medicine availability statuses: high, medium, low, and out of stock" />
      </section>

      <section className="trust-story" id="trust">
        <img src={assets.verifiedCard} alt="Verified pharmacy badge" />
        <div><span className="section-kicker">Trust stays visible</span><h2>Public details and private documents have different jobs.</h2><p>Your pharmacy profile helps patients. Verification records stay in the compliance workflow, with clear review states and corrective actions.</p><div className="trust-points"><span><ShieldCheck /> Secure submission paths</span><span><MapPin /> Accurate location details</span><span><BadgeCheck /> Transparent verification state</span></div></div>
      </section>

      <section className="landing-cta"><div><img src={assets.ribbon} alt="" /><span>Ready to partner?</span><h2>Bring dependable medicine availability closer to your community.</h2></div><Link className="button" to="/register">Create pharmacy account <ArrowRight /></Link></section>

      <footer className="landing-footer" id="footer"><Brand /><p>Pharmacy tools for trusted medicine availability.</p><nav><a href="#why">For pharmacies</a><a href="#trust">Trust</a><a href="mailto:support@example.com">Contact</a></nav><span>© 2026 Oath of Care</span></footer>
    </main>
  );
}
