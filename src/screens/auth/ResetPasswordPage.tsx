import { Check, KeyRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { useToast } from '@/src/components/ui/Toast';
import { authService } from '@/src/services/authService';

export function ResetPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const { showToast } = useToast();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirm = String(form.get('confirm') || '');
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return showToast('Use 8+ characters with uppercase, lowercase, a number, and a symbol.', 'error');
    }
    if (password !== confirm) return showToast('Passwords do not match.', 'error');
    setBusy(true);
    try { await authService.updateRecoveredPassword(password); setComplete(true); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Password reset failed.', 'error'); }
    finally { setBusy(false); }
  };

  return <div className="auth-card compact-auth-card">{complete ? <div className="auth-success"><span><Check size={28} /></span><h2>Password updated</h2><p>Your new password is ready. Sign in to continue to your pharmacy workspace.</p><Link className="button" to="/login">Continue to sign in</Link></div> : <><div className="auth-heading"><span className="auth-round-icon"><KeyRound /></span><h2>Create a new password</h2><p>This form only works from a valid Supabase password-recovery session.</p></div><form onSubmit={submit} className="form-stack"><PasswordInput label="New password" name="password" autoComplete="new-password" minLength={8} required /><PasswordInput label="Confirm new password" name="confirm" autoComplete="new-password" minLength={8} required /><p className="password-guidance">Use at least 8 characters with uppercase, lowercase, a number, and a symbol.</p><button className="button form-submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></form><p className="auth-switch"><Link to="/login">Back to sign in</Link></p></>}</div>;
}
