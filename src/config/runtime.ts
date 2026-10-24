const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export const runtime = {
  useMockData: Boolean(runtimeEnv.DEV) && runtimeEnv.VITE_USE_MOCK_DATA === 'true',
  hasMapsKey: Boolean(runtimeEnv.VITE_GOOGLE_MAPS_WEB_KEY),
  mapsKey: runtimeEnv.VITE_GOOGLE_MAPS_WEB_KEY || '',
  showcaseVideoUrl: runtimeEnv.VITE_SHOWCASE_VIDEO_URL || '',
  googleOAuthClientId: runtimeEnv.VITE_GOOGLE_OAUTH_CLIENT_ID || '',
  facebookAppId: runtimeEnv.VITE_FACEBOOK_APP_ID || '',
  securityApiBase: runtimeEnv.VITE_SECURITY_API_BASE || '',
  apiBase: (runtimeEnv.VITE_API_BASE_URL || runtimeEnv.VITE_SECURITY_API_BASE || '').replace(/\/$/, ''),
  demoApplicationStatus: runtimeEnv.VITE_DEMO_APPLICATION_STATUS || 'UNDER_REVIEW',
} as const;
