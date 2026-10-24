import { apiRequest, jsonBody } from '@/src/services/apiClient';
import { supabase } from '@/src/lib/supabase';

type Challenge = { challengeId: string; maskedEmail: string; expiresAt: string };
type VerifiedChallenge = { verificationToken: string };

export const securityService = {
  issuePasswordChallenge() { return apiRequest<Challenge>('/password-challenges', { method: 'POST' }); },
  verifyPasswordChallenge(challengeId: string, code: string) { return apiRequest<VerifiedChallenge>(`/password-challenges/${encodeURIComponent(challengeId)}/verify`, { method: 'POST', body: jsonBody({ code }) }); },
  async requestSupabaseReauthentication() {
    if (!supabase) throw new Error('Supabase authentication is not configured.');
    const { error } = await supabase.auth.reauthenticate();
    if (error) throw error;
  },
  async updatePassword(verificationToken: string, newPassword: string, nonce: string) {
    if (!supabase) throw new Error('Supabase authentication is not configured.');
    await apiRequest<void>('/password-challenges/consume', { method: 'POST', body: jsonBody({ verificationToken }) });
    const { error } = await supabase.auth.updateUser({ password: newPassword, nonce });
    if (error) throw error;
  },
};
