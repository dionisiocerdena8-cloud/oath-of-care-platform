import { Eye, EyeOff } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string;
  hint?: ReactNode;
};

export function PasswordInput({ label, error, hint, id, className = '', ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const descriptionId = error || hint ? `${inputId}-description` : undefined;

  const field = (
    <>
      <div className={`password-input ${error ? 'has-error' : ''}`}>
        <input
          {...props}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {(error || hint) && <span id={descriptionId} className={error ? 'field-error' : 'field-hint'}>{error || hint}</span>}
    </>
  );

  return label ? <label className={`password-field ${className}`}>{label}{field}</label> : field;
}
