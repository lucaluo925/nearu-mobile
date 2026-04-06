/**
 * usePet — pet state for the NearU mobile app.
 *
 * Calls the deployed NearU web API (/api/pet) with Bearer token auth.
 * The web API handles level computation, mood, and all pet mutations.
 *
 * For guests: pet is null (pet features require login).
 */

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/supabase'
import { computeLevel, computeMood, levelProgress, type PetMood, type LevelProgress } from '@/lib/types'
import type { Session } from '@supabase/supabase-js'

export interface PetState {
  pet_type:       string
  xp:             number
  level:          number
  mood:           PetMood
  last_action_at: string | null
  unlocked_pets:  string[]
  egg_count:      number
  levelProgress:  LevelProgress
}

export function usePet(session: Session | null) {
  const [pet,     setPet]     = useState<PetState | null>(null)
  const [loading, setLoading] = useState(false)

  const userId = session?.user?.id ?? null

  const refresh = useCallback(async () => {
    if (!userId) { setPet(null); return }

    setLoading(true)
    try {
      const r = await apiFetch('/api/pet')
      if (r.ok) {
        const data = await r.json()
        setPet({
          ...data,
          level:         computeLevel(data.xp),
          mood:          computeMood(data.last_action_at),
          levelProgress: levelProgress(data.xp),
        })
      } else if (r.status === 401 || r.status === 404) {
        setPet(null)
      }
    } catch {
      // Network error — keep current state
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  // ── Award XP (fire-and-forget) ────────────────────────────────────────────
  const awardXP = useCallback(async (action: string) => {
    if (!userId) return
    try {
      const r = await apiFetch('/api/pet/xp', {
        method: 'POST',
        body:   JSON.stringify({ action }),
      })
      if (r.ok) {
        const data = await r.json()
        setPet((prev) => prev ? {
          ...prev,
          xp:            data.xp,
          level:         computeLevel(data.xp),
          mood:          computeMood(prev.last_action_at),
          levelProgress: levelProgress(data.xp),
        } : null)
      }
    } catch {}
  }, [userId])

  return { pet, loading, refresh, awardXP }
}
