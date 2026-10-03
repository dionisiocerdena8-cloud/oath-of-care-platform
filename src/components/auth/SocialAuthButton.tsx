import type { ButtonHTMLAttributes } from 'react';
import { ProviderIcon } from './ProviderIcon';

type Provider = 'google' | 'facebook';

export function SocialAuthButton({ provider, children, ...props }: { provider: Provider } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="social-auth-button" {...props}>
      <ProviderIcon provider={provider} className="provider-icon" />
      {children ?? `Continue with ${provider === 'google' ? 'Google' : 'Facebook'}`}
    </button>
  );
}
