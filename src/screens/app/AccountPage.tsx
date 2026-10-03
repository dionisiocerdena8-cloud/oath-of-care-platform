import { Check, KeyRound, Laptop, Link2, LockKeyhole, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderIcon } from '@/src/components/auth/ProviderIcon';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { useToast } from '@/src/components/ui/Toast';

export function AccountPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const changePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = String(form.get('new'));
    const confirm = String(form.get('confirm'));
    if (next.length < 8) return showToast('New password must contain at least 8 characters.', 'error');
    if (next !== confirm) return showToast('New passwords do not match.', 'error');
    showToast('Password update requires a configured Supabase session.', 'info');
  };

  return (
    <><header className="page-header"><div><span className="eyebrow">Identity &amp; access</span><h1>Account &amp; security</h1><p>Manage sign-in providers, password options, and your active session.</p></div></header>
      <div className="account-layout">
        <section className="panel form-section"><div className="section-title"><span><Mail /></span><div><h2>Account email</h2><p>Primary sign-in and application contact.</p></div></div><div className="account-email"><span>pharmacy@example.com</span><small><Check /> Email confirmed</small></div></section>
        <section className="panel form-section"><div className="section-title"><span><Link2 /></span><div><h2>Linked providers</h2><p>Supported sign-in methods for this portal.</p></div></div><div className="provider-list"><div><ProviderIcon provider="google" className="provider-icon" /><div><strong>Google</strong><p>Not connected</p></div><button onClick={() => showToast('Google OAuth requires provider configuration.', 'info')}>Connect</button></div><div><ProviderIcon provider="facebook" className="provider-icon" /><div><strong>Facebook</strong><p>Not connected</p></div><button onClick={() => showToast('Facebook OAuth requires provider configuration.', 'info')}>Connect</button></div><div><span className="provider-letter email-letter"><Mail /></span><div><strong>Email &amp; password</strong><p>Connected · pharmacy@example.com</p></div><span className="connected"><Check /> Connected</span></div></div></section>
        <section className="panel form-section password-security"><div className="section-title"><span><KeyRound /></span><div><h2>Password security</h2><p>Use at least 8 characters and avoid reused passwords.</p></div></div><form onSubmit={changePassword} className="password-change-form"><PasswordInput label="Current password" name="current" placeholder="Enter current password" autoComplete="current-password" required /><PasswordInput label="New password" name="new" placeholder="Create a new password" minLength={8} autoComplete="new-password" required /><PasswordInput label="Confirm new password" name="confirm" placeholder="Re-enter new password" minLength={8} autoComplete="new-password" required /><button className="button">Update password</button></form></section>
        <section className="panel form-section"><div className="section-title"><span><Laptop /></span><div><h2>Session &amp; security</h2><p>Your current pharmacy portal session.</p></div></div><div className="session-row"><span><Laptop /></span><div><strong>Windows · Current session</strong><p>San Jose del Monte, PH · Last active now</p></div><span className="current-session">Current</span></div></section>
        <section className="panel mfa-panel"><span><ShieldCheck /></span><div><h2>Multi-factor authentication</h2><p>Prepared for future backend support. MFA is not currently active.</p></div><button disabled>Coming later</button></section>
        <section className="panel danger-zone"><div><span><LockKeyhole /></span><div><h2>Sign out</h2><p>End the pharmacy portal session on this device.</p></div></div><button className="button button-danger" onClick={() => navigate('/login')}><LogOut /> Log out</button></section>
      </div>
    </>
  );
}
