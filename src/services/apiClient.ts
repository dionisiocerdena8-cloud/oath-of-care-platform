import { runtime } from '@/src/config/runtime';
import { supabase } from '@/src/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type ApiProblem = { message?: string; code?: string };

/**
 * Returns the currently active Supabase session.
 * If the page was just loaded with OAuth callback parameters in the URL
 * (#access_token=... or ?code=...), this helper waits for Supabase's
 * asynchronous session hydration to complete before resolving.
 */
export async function getValidSession(maxWaitMs = 3500): Promise<Session | null> {
  if (!supabase) return null;

  // 1. Check existing session in storage/memory
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session;

  // 2. If URL contains OAuth callback markers, await onAuthStateChange
  const hasUrlAuth = typeof window !== 'undefined' && (
    window.location.hash.includes('access_token=') ||
    window.location.search.includes('code=')
  );

  if (hasUrlAuth) {
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(async () => {
        if (resolved) return;
        resolved = true;
        sub.unsubscribe();
        const { data } = await supabase!.auth.getSession();
        resolve(data.session);
      }, maxWaitMs);

      const { data: { subscription: sub } } = supabase!.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          sub.unsubscribe();
          resolve(session);
        }
      });
    });
  }

  return session;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!runtime.apiBase) throw new Error('The pharmacy API is not configured. Set VITE_API_BASE_URL.');
  if (!supabase) throw new Error('Supabase authentication is not configured.');

  let session = await getValidSession();
  if (!session?.access_token) throw new Error('Your session expired. Please sign in again.');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  let response = await fetch(`${runtime.apiBase}${path}`, { ...init, headers });

  // If 401 Unauthorized, attempt a single session refresh and retry
  if (response.status === 401) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session?.access_token) {
      session = refreshed.session;
      headers.set('Authorization', `Bearer ${session.access_token}`);
      response = await fetch(`${runtime.apiBase}${path}`, { ...init, headers });
    }
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({})) as T & ApiProblem;
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status}).`);
  return body;
}

export const jsonBody = (value: unknown) => JSON.stringify(value);
