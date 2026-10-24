import {
  BarChart3, Bell, Building2, CheckCheck, ChevronUp, CircleGauge, ClipboardCheck,
  LifeBuoy, LogOut, Menu, PackageSearch, RefreshCw, ShieldCheck,
  UserRoundCog, X,
} from 'lucide-react';
import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';
import { runtime } from '@/src/config/runtime';
import { useToast } from '@/src/components/ui/Toast';
import { notificationService } from '@/src/services/notificationService';
import { authService } from '@/src/services/authService';
import { pharmacyService } from '@/src/services/pharmacyService';
import type { PharmacyIdentity, PharmacyNotification } from '@/src/types/models';

const navItems = [
  { to: '/app/dashboard', label: 'Overview', icon: CircleGauge },
  { to: '/app/inventory', label: 'Medicines', icon: PackageSearch },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/profile', label: 'Pharmacy profile', icon: Building2 },
  { to: '/app/verification', label: 'Verification', icon: ClipboardCheck },
];

const sectionMeta: Record<string, { name: string; context: string }> = {
  '/app/dashboard': { name: 'Overview', context: 'Daily operations' },
  '/app/inventory': { name: 'Medicines', context: 'Availability workspace' },
  '/app/analytics': { name: 'Analytics', context: 'Patient discovery' },
  '/app/profile': { name: 'Pharmacy profile', context: 'Public information' },
  '/app/verification': { name: 'Verification', context: 'Compliance records' },
  '/app/notifications': { name: 'Notifications', context: 'Workspace updates' },
  '/app/account': { name: 'Account & security', context: 'Identity and access' },
};

const fallbackIdentity: PharmacyIdentity = {
  pharmacyName: 'Pharmacy account',
  email: '',
  role: 'Partner workspace',
  initials: 'OC',
  verificationStatus: 'UNKNOWN',
};

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PharmacyNotification[] | null>(null);
  const [notificationError, setNotificationError] = useState(false);
  const [identity, setIdentity] = useState<PharmacyIdentity | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const currentIdentity = identity ?? fallbackIdentity;
  const section = sectionMeta[location.pathname] ?? { name: 'Pharmacy portal', context: 'Oath of Care' };
  const activeIndex = Math.max(0, navItems.findIndex((item) => location.pathname.startsWith(item.to)));

  const loadNotifications = () => {
    setNotifications(null);
    setNotificationError(false);
    notificationService.list().then(setNotifications).catch(() => { setNotifications([]); setNotificationError(true); });
  };

  useEffect(() => {
    notificationService.list().then(setNotifications).catch(() => { setNotifications([]); setNotificationError(true); });
    pharmacyService.getIdentity().then(setIdentity).catch(() => setIdentity(null));
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!accountRef.current?.contains(target)) setAccountOpen(false);
      if (!notificationRef.current?.contains(target)) setNotificationsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (accountOpen) accountTriggerRef.current?.focus();
      if (notificationsOpen) notificationTriggerRef.current?.focus();
      setAccountOpen(false);
      setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [accountOpen, notificationsOpen]);

  const markRead = async (id: string) => {
    await notificationService.markRead(id);
    setNotifications((current) => current?.map((item) => item.id === id ? { ...item, read: true } : item) ?? []);
  };
  const unread = notifications?.filter((item) => !item.read).length ?? 0;

  const signOut = async () => {
    await authService.signOut();
    showToast('You have been signed out.', 'info');
    navigate('/login');
  };

  const openAccount = () => {
    setAccountOpen((value) => {
      const next = !value;
      if (next) window.requestAnimationFrame(() => accountRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
      return next;
    });
    setNotificationsOpen(false);
  };

  const moveMenuFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [...(accountRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + delta + items.length) % items.length].focus();
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head">
          <Brand />
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        {runtime.useMockData && <div className="demo-badge"><span /> Demo workspace</div>}
        <nav className="sidebar-nav" aria-label="Pharmacy operations">
          <p>Pharmacy workspace</p>
          <div className="sidebar-links" style={{ '--active-index': activeIndex } as CSSProperties}>
            <span className="nav-active-rail" aria-hidden="true" />
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => { setMobileOpen(false); setAccountOpen(false); setNotificationsOpen(false); }} className={({ isActive }) => isActive ? 'active' : ''}>
                <Icon size={19} /><span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-account" ref={accountRef}>
          {accountOpen && (
            <nav className="account-popover sidebar-account-popover" aria-label="Pharmacy account" role="menu" onKeyDown={moveMenuFocus}>
              <div className="account-popover-identity">
                <span className="avatar">{currentIdentity.initials}</span>
                <span><strong>{currentIdentity.pharmacyName}</strong><small>{currentIdentity.email || currentIdentity.role}</small></span>
              </div>
              {currentIdentity.verificationStatus !== 'UNKNOWN' && <span className="account-verification"><ShieldCheck size={14} /> {currentIdentity.verificationStatus === 'VERIFIED' ? 'Verified pharmacy' : 'Verification in progress'}</span>}
              <NavLink role="menuitem" to="/app/profile" onClick={() => setAccountOpen(false)}><Building2 size={17} />Pharmacy profile</NavLink>
              <NavLink role="menuitem" to="/app/account#security" onClick={() => setAccountOpen(false)}><UserRoundCog size={17} />Account & security</NavLink>
              <a role="menuitem" href="mailto:support@example.com"><LifeBuoy size={17} />Help & support</a>
              <button role="menuitem" onClick={() => void signOut()}><LogOut size={17} />Sign out</button>
            </nav>
          )}
          <button ref={accountTriggerRef} className="account-switcher" aria-haspopup="menu" aria-expanded={accountOpen} onClick={openAccount}>
            <span className="avatar">{currentIdentity.initials}</span>
            <span><strong>{currentIdentity.pharmacyName}</strong><small>{currentIdentity.role}</small></span>
            <ChevronUp size={16} className={accountOpen ? 'open' : ''} />
          </button>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <section className="app-main">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <span className="mobile-top-brand"><Brand compact /></span>
          <div className="topbar-context"><small>{section.context}</small><strong>{section.name}</strong></div>
          <div className="topbar-actions">
            <div className="topbar-popover" ref={notificationRef}>
              <button ref={notificationTriggerRef} className="notification-button" aria-label={`${unread} unread notifications`} aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setAccountOpen(false); }}><Bell size={19} />{unread > 0 && <span>{unread}</span>}</button>
              {notificationsOpen && <section className="notification-popover" role="dialog" aria-label="Notifications">
                <header><div><strong>Notifications</strong><small>{unread ? `${unread} unread` : 'All caught up'}</small></div>{unread > 0 && <button onClick={async () => { for (const item of notifications ?? []) if (!item.read) await markRead(item.id); }}><CheckCheck size={15} /> Mark all read</button>}</header>
                <div>{notifications === null ? <p className="popover-state">Loading updates…</p> : notificationError ? <div className="popover-state popover-error"><span>Notifications are unavailable.</span><button onClick={loadNotifications}><RefreshCw size={14} /> Try again</button></div> : notifications.length === 0 ? <p className="popover-state">No notifications yet.</p> : notifications.slice(0, 5).map((item) => <button key={item.id} className={item.read ? '' : 'unread'} onClick={() => void markRead(item.id)}><span className="notice-dot" /><span><strong>{item.title}</strong><small>{item.message}</small><time>{item.createdAt}</time></span></button>)}</div>
                <NavLink to="/app/notifications" onClick={() => setNotificationsOpen(false)}>View notification history</NavLink>
              </section>}
            </div>
          </div>
        </header>
        <main className="page-content"><div className="route-stage" key={location.pathname}><Outlet /></div></main>
      </section>
    </div>
  );
}
