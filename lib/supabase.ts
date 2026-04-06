/**
 * Supabase client for the NearU mobile app.
 *
 * Uses expo-secure-store for secure token persistence (required on iOS).
 * The session is automatically refreshed and persisted between app launches.
 *
 * Auth mechanism: Supabase JWT stored in SecureStore.
 * When calling the NearU web API, pass the token as a Bearer header —
 * the web API's auth-helper.ts accepts both cookies (web) and Bearer (mobile).
 */

import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// ── Secure token storage adapter ─────────────────────────────────────────────

const SecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

// ── Client ────────────────────────────────────────────────────────────────────

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:           SecureStoreAdapter,
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false,
  },
})

// ── Helper: get current bearer token ─────────────────────────────────────────
// Use this when calling the NearU web API from the mobile app.

export async function getBearerToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

// ── Helper: authenticated fetch to the NearU web API ─────────────────────────

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getBearerToken()
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}
