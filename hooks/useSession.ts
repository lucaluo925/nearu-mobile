/**
 * useSession — auth state for the NearU mobile app.
 *
 * Subscribes to Supabase auth state changes so every component
 * has access to the current user without prop drilling.
 */

import { useState, useEffect } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface SessionState {
  session:   Session | null
  user:      User | null
  loading:   boolean
  isGuest:   boolean
}

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    session,
    user:    session?.user ?? null,
    loading,
    isGuest: !session?.user,
  }
}
