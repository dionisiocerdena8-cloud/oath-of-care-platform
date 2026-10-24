import { AlertCircle, ArrowRight, CheckCircle2, LoaderCircle, MailCheck, RotateCcw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { authService } from '@/src/services/authService';

interface EmailOtpVerificationProps {
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function EmailOtpVerification({ email, onVerified, onCancel }: EmailOtpVerificationProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyCode = async (code: string) => {
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }
    setBusy(true);
    setError('');
    setResendSuccess(false);
    try {
      await authService.verifyEmailOtp(email, code);
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);
    setError('');
    setResendSuccess(false);

    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (char && nextDigits.every((d) => d !== '')) {
      void verifyCode(nextDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || '';
    }
    setDigits(nextDigits);
    setError('');
    setResendSuccess(false);

    const nextFocusIndex = Math.min(pasted.length, 5);
    inputsRef.current[nextFocusIndex]?.focus();

    if (pasted.length === 6) {
      void verifyCode(pasted);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || busy) return;
    setError('');
    setResendSuccess(false);
    setBusy(true);
    try {
      await authService.resendVerificationCode(email);
      setCooldown(60);
      setResendSuccess(true);
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setBusy(false);
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div className="otp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="otp-title">
      <div className="otp-card">
        <div className="otp-icon-badge" aria-hidden="true">
          <MailCheck size={28} />
        </div>
        <h2 id="otp-title">Verify your email address</h2>
        <p>
          We sent a 6-digit confirmation code to <strong>{email}</strong>. Enter it below to unlock your pharmacy onboarding workspace.
        </p>

        <div className="otp-inputs-row" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputsRef.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              value={digit}
              disabled={busy}
              className={`otp-digit-input ${digit ? 'has-value' : ''}`}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              aria-label={`Digit ${idx + 1} of 6`}
            />
          ))}
        </div>

        {error && (
          <div className="otp-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="otp-error-banner" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }} role="status">
            <CheckCircle2 size={16} />
            <span>A fresh verification code was sent to your email.</span>
          </div>
        )}

        <div className="otp-resend-row">
          <span>Didn&apos;t receive the code?</span>
          {cooldown > 0 ? (
            <span>Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              className="otp-resend-button"
              onClick={() => void handleResend()}
              disabled={busy}
            >
              <RotateCcw size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
              Resend code
            </button>
          )}
        </div>

        <div className="otp-actions-column">
          <button
            type="button"
            className="otp-submit-button"
            disabled={!isComplete || busy}
            onClick={() => void verifyCode(digits.join(''))}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={17} />
                Verifying…
              </>
            ) : (
              <>
                Verify and continue <ArrowRight size={17} />
              </>
            )}
          </button>
          <button
            type="button"
            className="otp-back-button"
            onClick={onCancel}
            disabled={busy}
          >
            Change email or edit details
          </button>
        </div>
      </div>
    </div>
  );
}

