import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/src/services/authService';
import { useToast } from '@/src/components/ui/Toast';

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="provider-icon"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.36l-3.25-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.54l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>;
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const providerLogin = async (provider: 'google' | 'facebook') => {
    try { await authService.signInWithProvider(provider); } catch (error) { showToast(error instanceof Error ? error.message : 'Authentication failed.', 'error'); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    if (!email.includes('@') || password.length < 8) return showToast('Enter a valid email and at least 8 password characters.', 'error');
    setBusy(true);
    try { await authService.signInWithPassword(email, password); navigate('/application-status'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Sign in failed.', 'error'); }
    finally { setBusy(false); }
  };
  return (
    <div className="auth-card">
      <div className="auth-heading"><span className="eyebrow">Welcome back</span><h2>Sign in to your pharmacy</h2><p>Use the account connected to your pharmacy application.</p></div>
      <div className="provider-stack"><button onClick={() => providerLogin('google')}><GoogleIcon /> Continue with Google</button><button onClick={() => providerLogin('facebook')}><span className="provider-letter facebook-letter">f</span> Continue with Facebook</button></div>
      <div className="divider"><span>or continue with email</span></div>
      <form onSubmit={submit} className="form-stack">
        <label>Email address<input type="email" name="email" placeholder="pharmacy@example.com" autoComplete="email" required /></label>
        <label>Password<div className="input-with-action"><input type={showPassword ? 'text' : 'password'} name="password" placeholder="At least 8 characters" autoComplete="current-password" required minLength={8} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
        <div className="form-meta"><label className="check-label"><input type="checkbox" /> Remember me</label><Link to="/forgot-password">Forgot password?</Link></div>
        <button className="button form-submit" disabled={busy}>{busy ? 'Signing inâ€¦' : 'Sign in'}</button>
      </form>
      <p className="auth-switch">New pharmacy? <Link to="/register">Create an account</Link></p>
      <p className="security-note">Authentication confirms your account. Pharmacy access still requires document review and approval.</p>
    </div>
  );
}

