import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SocialAuthButton } from '@/src/components/auth/SocialAuthButton';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { useToast } from '@/src/components/ui/Toast';
import { authService } from '@/src/services/authService';

export function LoginPage() {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const providerLogin = async (provider: 'google' | 'facebook') => {
    try { await authService.signInWithProvider(provider); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Authentication failed.', 'error'); }
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
      <div className="auth-heading"><span className="auth-context">Pharmacy partner access</span><h2>Welcome back</h2><p>Sign in with the account connected to your pharmacy.</p></div>
      <div className="provider-stack"><SocialAuthButton provider="google" onClick={() => providerLogin('google')} /><SocialAuthButton provider="facebook" onClick={() => providerLogin('facebook')} /></div>
      <div className="divider"><span>or continue with email</span></div>
      <form onSubmit={submit} className="form-stack">
        <label>Email address<input type="email" name="email" placeholder="name@example.com" autoComplete="email" required /></label>
        <div className="password-field-group"><div className="password-label-row"><span>Password</span><Link to="/forgot-password">Forgot password?</Link></div><PasswordInput name="password" placeholder="Enter your password" autoComplete="current-password" required minLength={8} /></div>
        <button className="button form-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="auth-switch">New to the platform? <Link to="/register">Create a pharmacy account</Link></p>
    </div>
  );
}
