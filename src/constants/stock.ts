export const MOBILE_STOCK_POLICY = {
  source: 'Android mobile source audit: src/types/domain.ts',
  supportedMobileStates: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'] as const,
  numericThresholds: null,
  note: 'The mobile source does not define numeric LOW / MEDIUM / HIGH quantity thresholds. Do not infer production thresholds. MEDIUM_STOCK and HIGH_STOCK must be supplied by the backend until a shared business rule is approved.',
} as const;

