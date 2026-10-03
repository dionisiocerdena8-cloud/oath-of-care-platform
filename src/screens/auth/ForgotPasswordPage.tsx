import { CheckCircle2, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/src/services/authService';
import { useToast } from '@/src/components/ui/Toast';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') || '');
    try { await authService.resetPassword(email); setSent(true); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to send reset email.', 'error'); }
  }
  return (
    <div className="auth-card compact-auth-card">
      {sent ? <div className="auth-success"><span><CheckCircle2 size={28} /></span><h2>Check your inbox</h2><p>If an account exists for that email, a secure password reset link is on its way.</p><Link className="button" to="/login">Return to sign in</Link></div> :
      <><div className="auth-heading"><span className="auth-round-icon"><Mail /></span><h2>Reset your password</h2><p>Enter your pharmacy account email and we’ll send a secure reset link.</p></div><form onSubmit={submit} className="form-stack"><label>Email address<input type="email" name="email" placeholder="pharmacy@example.com" required /></label><button className="button form-submit">Send reset link</button></form><p className="auth-switch"><Link to="/login">Back to sign in</Link></p></>}
    </div>
  );
}


