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

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? ''
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnon) {
  console.warn('[NearU] Supabase env vars not set — check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            SecureStoreAdapter,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
})

// ── Helper: get current bearer token ─────────────────────────────────────────

export async function getBearerToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

// ── Helper: authenticated fetch to the NearU web API ─────────────────────────
// Falls back gracefully when EXPO_PUBLIC_API_URL is not configured.

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

const API_TIMEOUT_MS = 12_000

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  // Guard: API URL required for web-API calls (pet XP, points)
  if (!API_URL) {
    console.warn(`[NearU] apiFetch(${path}) skipped — EXPO_PUBLIC_API_URL not configured`)
    return new Response(
      JSON.stringify({ error: 'API URL not configured', skipped: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const token = await getBearerToken()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })
    clearTimeout(timer)
    return response
  } catch (e) {
    clearTimeout(timer)
    if ((e as Error)?.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Request timed out' }),
        { status: 408, headers: { 'Content-Type': 'application/json' } },
      )
    }
    throw e
  }
}
