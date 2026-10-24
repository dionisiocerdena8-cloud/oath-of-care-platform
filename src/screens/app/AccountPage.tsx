import { Check, KeyRound, Laptop, Link2, LockKeyhole, LogOut, Mail, RotateCcw, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderIcon } from '@/src/components/auth/ProviderIcon';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { Modal } from '@/src/components/ui/Modal';
import { useToast } from '@/src/components/ui/Toast';
import { securityService } from '@/src/services/securityService';
import { authService } from '@/src/services/authService';

type Challenge = { id: string; email: string; expiresAt: string };
type Account = { email: string; emailConfirmed: boolean; providers: Set<string> };

export function AccountPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [code, setCode] = useState('');
  const [reauthCode, setReauthCode] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { authService.getAccount().then(setAccount).catch(() => setAccount(null)); }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const close = () => { setDialogOpen(false); setChallenge(null); setVerificationToken(''); setCode(''); setReauthCode(''); setError(''); setCooldown(0); };
  const issueChallenge = async () => {
    setDialogOpen(true); setBusy(true); setError(''); setVerificationToken('');
    try { const result = await securityService.issuePasswordChallenge(); setChallenge({ id: result.challengeId, email: result.maskedEmail, expiresAt: result.expiresAt }); setCooldown(45); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send a verification code.'); }
    finally { setBusy(false); }
  };
  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!challenge || code.length !== 6) return setError('Enter the complete 6-digit code.');
    setBusy(true); setError('');
    try { const result = await securityService.verifyPasswordChallenge(challenge.id, code); await securityService.requestSupabaseReauthentication(); setVerificationToken(result.verificationToken); setCode(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The code is invalid or expired.'); }
    finally { setBusy(false); }
  };
  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = String(form.get('new')); const confirm = String(form.get('confirm')); const nonce = String(form.get('nonce'));
    if (next.length < 8 || !/[A-Z]/.test(next) || !/[a-z]/.test(next) || !/[0-9]/.test(next) || !/[^A-Za-z0-9]/.test(next)) return setError('Use 8+ characters with uppercase, lowercase, a number, and a symbol.');
    if (next !== confirm) return setError('New passwords do not match.');
    if (!/^\d{6}$/.test(nonce)) return setError('Enter the 6-digit Supabase reauthentication code.');
    setBusy(true); setError('');
    try { await securityService.updatePassword(verificationToken, next, nonce); close(); showToast('Password updated securely.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Password update failed.'); }
    finally { setBusy(false); }
  };
  const linkProvider = async (provider: 'google' | 'facebook') => {
    try { await authService.linkProvider(provider); }
    catch (cause) { showToast(cause instanceof Error ? cause.message : 'Provider connection failed.', 'error'); }
  };
  const signOut = async () => { await authService.signOut(); showToast('You have been signed out.', 'info'); navigate('/login'); };

  return <>
    <header className="page-header"><div><span className="eyebrow">Identity & access</span><h1>Account & security</h1><p>Manage sign-in providers, protected password changes, and your active session.</p></div></header>
    <div className="account-layout">
      <section className="panel form-section" id="personal"><div className="section-title"><span><Mail /></span><div><h2>Account email</h2><p>Primary sign-in and verification contact.</p></div></div><div className="account-email"><span>{account?.email || 'Loading account…'}</span>{account?.emailConfirmed && <small><Check /> Email confirmed</small>}</div></section>
      <section className="panel form-section"><div className="section-title"><span><Link2 /></span><div><h2>Linked providers</h2><p>Supported sign-in methods for this portal.</p></div></div><div className="provider-list">
        <div><ProviderIcon provider="google" className="provider-icon" /><div><strong>Google</strong><p>{account?.providers.has('google') ? 'Connected' : 'Not connected'}</p></div>{account?.providers.has('google') ? <span className="connected"><Check /> Connected</span> : <button onClick={() => void linkProvider('google')}>Connect</button>}</div>
        <div><ProviderIcon provider="facebook" className="provider-icon" /><div><strong>Facebook</strong><p>{account?.providers.has('facebook') ? 'Connected' : 'Not connected'}</p></div>{account?.providers.has('facebook') ? <span className="connected"><Check /> Connected</span> : <button onClick={() => void linkProvider('facebook')}>Connect</button>}</div>
        <div><span className="provider-letter email-letter"><Mail /></span><div><strong>Email & password</strong><p>{account?.providers.has('email') ? `Connected · ${account.email}` : 'Password can be set after verification'}</p></div>{account?.providers.has('email') && <span className="connected"><Check /> Connected</span>}</div>
      </div></section>
      <section className="panel security-callout" id="security"><span><KeyRound /></span><div><h2>Password & sign-in</h2><p>Two short verification steps protect access to the password form and the password update itself.</p></div><button className="button" onClick={() => void issueChallenge()}>Change password</button></section>
      <section className="panel form-section"><div className="section-title"><span><Laptop /></span><div><h2>Session & security</h2><p>Your current pharmacy portal session.</p></div></div><div className="session-row"><span><Laptop /></span><div><strong>Current browser session</strong><p>Authenticated through Supabase · Last active now</p></div><span className="current-session">Current</span></div></section>
      <section className="panel mfa-panel"><span><ShieldCheck /></span><div><h2>Multi-factor authentication</h2><p>Manage MFA through the configured Supabase Auth methods when enabled.</p></div><button disabled>Not enabled</button></section>
      <section className="panel danger-zone"><div><span><LockKeyhole /></span><div><h2>Sign out</h2><p>End the pharmacy portal session on this device.</p></div></div><button className="button button-danger" onClick={() => void signOut()}><LogOut /> Sign out</button></section>
    </div>
    <Modal open={dialogOpen} title={verificationToken ? 'Create a new password' : 'Verify your identity'} onClose={close}>
      <div className="verification-dialog">{!verificationToken ? <>
        <span className="verification-lock"><ShieldCheck /></span><p>{challenge ? <>Enter the 6-digit code sent to <strong>{challenge.email}</strong>. The server expires and invalidates this challenge after use.</> : 'A verification code is required before password settings can be opened.'}</p>
        {challenge && <form onSubmit={verify}><label>Verification code<input className="otp-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus aria-describedby="otp-help" /></label><small id="otp-help">Expires at {new Date(challenge.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small><button className="button" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify code'}</button></form>}
        {error && <p className="verification-error">{error}</p>}<button className="resend-button" disabled={busy || cooldown > 0} onClick={() => void issueChallenge()}><RotateCcw /> {cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button>
      </> : <form className="password-change-form" onSubmit={updatePassword}>
        <p className="verified-challenge"><Check /> Identity gate verified. Supabase sent a second code to authorize the actual password update.</p>
        <label>Supabase reauthentication code<input className="otp-input" name="nonce" value={reauthCode} onChange={(event) => setReauthCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
        <PasswordInput label="New password" name="new" autoComplete="new-password" minLength={8} required /><PasswordInput label="Confirm new password" name="confirm" autoComplete="new-password" minLength={8} required />
        {error && <p className="verification-error">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
      </form>}</div>
    </Modal>
  </>;
}
