import { Check, KeyRound, Laptop, Link2, LockKeyhole, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/src/components/ui/Toast';

export function AccountPage() {
  const { showToast } = useToast(); const navigate = useNavigate();
  const changePassword = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (String(form.get('new')).length < 8) return showToast('New password must contain at least 8 characters.', 'error'); showToast('Password update requires a configured Supabase session.', 'info'); };
  return (
    <><header className="page-header"><div><span className="eyebrow">Identity & access</span><h1>Account & security</h1><p>Manage sign-in providers, password options, and active sessions.</p></div></header>
      <div className="account-layout">
        <section className="panel form-section"><div className="section-title"><span><Mail /></span><div><h2>Account email</h2><p>The primary email for sign-in and application updates.</p></div></div><div className="account-email"><span>pharmacy@example.com</span><small><Check /> Email confirmed</small></div></section>
        <section className="panel form-section"><div className="section-title"><span><Link2 /></span><div><h2>Linked providers</h2><p>Connect only the authentication methods supported by this portal.</p></div></div><div className="provider-list"><div><span className="provider-letter google-letter">G</span><div><strong>Google</strong><p>Not connected</p></div><button onClick={() => showToast('Google OAuth requires provider configuration.', 'info')}>Connect</button></div><div><span className="provider-letter facebook-letter">f</span><div><strong>Facebook</strong><p>Not connected</p></div><button onClick={() => showToast('Facebook OAuth requires provider configuration.', 'info')}>Connect</button></div><div><span className="provider-letter email-letter"><Mail /></span><div><strong>Email & password</strong><p>Connected Â· pharmacy@example.com</p></div><span className="connected"><Check /> Connected</span></div></div></section>
        <section className="panel form-section"><div className="section-title"><span><KeyRound /></span><div><h2>Change password</h2><p>Use at least 8 characters and avoid reused passwords.</p></div></div><form onSubmit={changePassword} className="form-grid"><label className="field-wide">Current password<input type="password" name="current" autoComplete="current-password" required /></label><label>New password<input type="password" name="new" minLength={8} autoComplete="new-password" required /></label><label>Confirm new password<input type="password" name="confirm" minLength={8} autoComplete="new-password" required /></label><button className="button">Update password</button></form></section>
        <section className="panel form-section"><div className="section-title"><span><Laptop /></span><div><h2>Active session</h2><p>Sessions are authoritative only when provided by Supabase.</p></div></div><div className="session-row"><span><Laptop /></span><div><strong>Windows Â· Current session</strong><p>San Jose del Monte, PH Â· Last active now</p></div><span className="current-session">Current</span></div></section>
        <section className="panel mfa-panel"><span><ShieldCheck /></span><div><h2>Multi-factor authentication</h2><p>Prepared for future backend support. MFA is not currently enforced or represented as active.</p></div><button disabled>Coming later</button></section>
        <section className="panel danger-zone"><div><span><LockKeyhole /></span><div><h2>Sign out</h2><p>End this pharmacy portal session on the current device.</p></div></div><button className="button button-danger" onClick={() => navigate('/login')}><LogOut /> Log out</button></section>
      </div>
    </>
  );
}

