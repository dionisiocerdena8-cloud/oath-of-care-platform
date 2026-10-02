import {
  BarChart3, Bell, Boxes, Building2, ChevronDown, CircleGauge, ClipboardCheck,
  LogOut, Menu, Search, ShieldCheck, UserRoundCog, X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';
import { runtime } from '@/src/config/runtime';
import { useToast } from '@/src/components/ui/Toast';

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: CircleGauge },
  { to: '/app/inventory', label: 'Inventory', icon: Boxes },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/profile', label: 'Pharmacy Profile', icon: Building2 },
  { to: '/app/verification', label: 'Verification', icon: ClipboardCheck },
  { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: 3 },
  { to: '/app/account', label: 'Account & Security', icon: UserRoundCog },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head"><Brand /><button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
        {runtime.useMockData && <div className="demo-badge"><span /> Development data</div>}
        <nav className="sidebar-nav" aria-label="Pharmacy portal">
          <p>Workspace</p>
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={19} /><span>{label}</span>{badge ? <small>{badge}</small> : null}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-reliability">
          <ShieldCheck size={20} />
          <div><strong>94% stock accuracy</strong><span>Good standing</span></div>
        </div>
        <button className="sidebar-logout" onClick={() => { showToast('Signed out of the local preview.', 'info'); navigate('/login'); }}><LogOut size={18} /> Log out</button>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <section className="app-main">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="top-search"><Search size={17} /><input aria-label="Search pharmacy workspace" placeholder="Search medicines, reports, pages..." /></div>
          <div className="topbar-actions">
            <NavLink to="/app/notifications" className="notification-button" aria-label="Notifications"><Bell size={19} /><span>3</span></NavLink>
            <button className="account-menu"><span className="avatar">SM</span><span>St. Martha Pharmacy<small>Verified partner</small></span><ChevronDown size={15} /></button>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </section>
    </div>
  );
}

