const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export const brand = {
  productName: runtimeEnv.VITE_APP_NAME || 'Oath of Care',
  pharmacyLabel: 'Pharmacy Partner',
  tagline: 'medicine within reach',
  supportEmail: 'support@example.com',
} as const;
