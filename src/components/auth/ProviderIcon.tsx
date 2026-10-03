import type { SVGProps } from 'react';

type Provider = 'google' | 'facebook';

export function ProviderIcon({ provider, ...props }: { provider: Provider } & SVGProps<SVGSVGElement>) {
  if (provider === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
        <circle cx="12" cy="12" r="10" fill="#1877F2" />
        <path fill="#fff" d="M13.55 21v-7h2.35l.35-2.73h-2.7V9.53c0-.79.22-1.33 1.36-1.33h1.45V5.76a19.4 19.4 0 0 0-2.11-.11c-2.09 0-3.52 1.27-3.52 3.62v2H8.36V14h2.37v7h2.82Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.36l-3.25-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.54l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}
