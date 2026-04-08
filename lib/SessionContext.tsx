/**
 * SessionContext — single shared auth state for the entire app.
 *
 * Without this, each screen calling useSession() independently creates its own
 * getSession() call and onAuthStateChange subscription. That means:
 *   - 5+ separate SecureStore reads on cold start
 *   - 5+ auth subscriptions firing independently
 *   - Screens update one re-render at a time when auth changes (staggered)
 *   - Every screen briefly sees isGuest=true while session loads
 *
 * With this provider at the root layout, there is exactly one session read and
 * one subscription. All screens receive the same session object simultaneously.
 */

import React, { createContext, useContext } from 'react'
import { useSession, type SessionState } from '@/hooks/useSession'

const SessionContext = createContext<SessionState>({
  session:  null,
  user:     null,
  loading:  true,
  isGuest:  true,
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const state = useSession()
  return (
    <SessionContext.Provider value={state}>
      {children}
    </SessionContext.Provider>
  )
}

/** Use this in all screens instead of useSession() directly. */
export function useSessionContext(): SessionState {
  return useContext(SessionContext)
}
