import { runtime } from '@/src/config/runtime';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

export const authService = {
  async signInWithPassword(email: string, password: string) {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signInWithProvider(provider: 'google' | 'facebook') {
    if (!supabase || !isSupabaseConfigured) throw new Error('Supabase authentication is not configured.');
    if (provider === 'google' && !runtime.googleOAuthClientId) throw new Error('Google OAuth is not configured.');
    if (provider === 'facebook' && !runtime.facebookAppId) throw new Error('Facebook OAuth is not configured.');
    return supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/application-status` } });
  },
  async resetPassword(email: string) {
    if (!supabase) throw new Error('Supabase authentication is not configured.');
    return supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  },
  async signOut() { if (supabase) await supabase.auth.signOut(); },
};

