const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export const brand = {
  productName: runtimeEnv.VITE_APP_NAME || 'Oath of Care',
  pharmacyLabel: 'Pharmacy Partner',
  tagline: 'Trusted availability. Better care.',
  supportEmail: 'support@example.com',
} as const;

