import { runtime } from '@/src/config/runtime';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { getValidSession } from '@/src/services/apiClient';
import { pharmacyService } from '@/src/services/pharmacyService';

export const authService = {
  async signUpWithPassword(email: string, password: string) {
    if (runtime.useMockData) return { requiresEmailConfirmation: false };
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured. Save the draft and ask an administrator to connect authentication.');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { requiresEmailConfirmation: !data.session };
  },

  async verifyEmailOtp(email: string, token: string) {
    if (runtime.useMockData) return { ok: true, session: null, user: null };
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    const cleaned = token.replace(/\D/g, '');
    if (cleaned.length !== 6) throw new Error('Enter the complete 6-digit verification code.');

    // Attempt verification with 'signup' type first
    const result = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: cleaned,
      type: 'signup',
    });

    if (result.error) {
      // Fallback to 'email' type if 'signup' type was rejected
      const fallback = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleaned,
        type: 'email',
      });
      if (fallback.error) {
        throw new Error(result.error.message || fallback.error.message || 'The verification code is invalid or has expired.');
      }
      return { ok: true, session: fallback.data.session, user: fallback.data.user };
    }

    return { ok: true, session: result.data.session, user: result.data.user };
  },

  async resendVerificationCode(email: string) {
    if (runtime.useMockData) return { ok: true };
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    const result = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    if (result.error) {
      throw new Error(result.error.message || 'Could not resend the verification code. Please wait a moment and try again.');
    }
    return { ok: true };
  },

  async signInWithPassword(email: string, password: string) {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    return result;
  },

  async signInWithProvider(provider: 'google' | 'facebook', redirectTo?: string) {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    const targetUrl = redirectTo || `${window.location.origin}/application-status`;
    const result = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: targetUrl },
    });
    if (result.error) throw result.error;
    return result;
  },

  async resolvePostLoginRoute(): Promise<string> {
    if (runtime.useMockData) {
      const status = pharmacyService.getCachedApplicationStatus();
      if (status === 'APPROVED') return '/app/dashboard';
      if (status === 'DRAFT') return '/register';
      return '/application-status';
    }
    try {
      const session = await getValidSession();
      if (!session) return '/login';
      const application = await pharmacyService.getApplication();
      if (application.status === 'APPROVED') return '/app/dashboard';
      if (application.status === 'DRAFT' || !application.id) return '/register';
      return '/application-status';
    } catch {
      return '/application-status';
    }
  },

  async linkProvider(provider: 'google' | 'facebook') {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    const { data, error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: `${window.location.origin}/app/account` } });
    if (error) throw error;
    return data;
  },

  async getAccount() {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw error || new Error('Your account could not be loaded.');
    return {
      email: data.user.email || '',
      emailConfirmed: Boolean(data.user.email_confirmed_at),
      providers: new Set((data.user.identities || []).map((identity) => identity.provider)),
    };
  },

  async resetPassword(email: string) {
    if (!supabase) throw new Error('Supabase authentication is not configured.');
    const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (result.error) throw result.error;
    return result;
  },

  async updateRecoveredPassword(password: string) {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('This recovery link is invalid or has expired. Request a new link.');
    const result = await supabase.auth.updateUser({ password });
    if (result.error) throw result.error;
    return result;
  },

  async signOut() { if (supabase) await supabase.auth.signOut(); },
};
