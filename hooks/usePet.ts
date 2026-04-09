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
import { computeLevel, computeMood, levelProgress, type PetMood, type LevelProgress, type PetType } from '@/lib/types'
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

  // ── Buy egg ───────────────────────────────────────────────────────────────
  const buyEgg = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!userId) return { ok: false, error: 'Not signed in' }
    try {
      const r = await apiFetch('/api/pet', {
        method: 'POST',
        body:   JSON.stringify({ action: 'buy_egg' }),
      })
      const data = await r.json()
      if (r.ok && data.ok) {
        setPet(prev => prev
          ? { ...prev, egg_count: data.egg_count ?? (prev.egg_count ?? 0) + 1 }
          : null
        )
        return { ok: true }
      }
      return { ok: false, error: data.error ?? 'Purchase failed' }
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }, [userId])

  // ── Hatch egg ─────────────────────────────────────────────────────────────
  const hatch = useCallback(async (petType: PetType): Promise<{ ok: boolean; error?: string }> => {
    if (!userId) return { ok: false, error: 'Not signed in' }
    try {
      const r = await apiFetch('/api/pet', {
        method: 'POST',
        body:   JSON.stringify({ action: 'hatch', pet_type: petType }),
      })
      const data = await r.json()
      if (r.ok && data.ok && data.pet) {
        const raw = data.pet
        setPet({
          ...raw,
          level:         computeLevel(raw.xp),
          mood:          computeMood(raw.last_action_at),
          levelProgress: levelProgress(raw.xp),
        })
        return { ok: true }
      }
      return { ok: false, error: data.error ?? 'Hatch failed' }
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }, [userId])

  // ── Unlock pet (direct purchase) ──────────────────────────────────────────
  const unlock = useCallback(async (petType: PetType): Promise<{ ok: boolean; error?: string }> => {
    if (!userId) return { ok: false, error: 'Not signed in' }
    try {
      const r = await apiFetch('/api/pet', {
        method: 'POST',
        body:   JSON.stringify({ action: 'unlock', pet_type: petType }),
      })
      const data = await r.json()
      if (r.ok && data.ok) {
        setPet(prev => prev
          ? { ...prev, unlocked_pets: data.unlocked_pets ?? [...prev.unlocked_pets, petType] }
          : null
        )
        return { ok: true }
      }
      return { ok: false, error: data.error ?? 'Unlock failed' }
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }, [userId])

  // ── Switch active pet ─────────────────────────────────────────────────────
  const switchActive = useCallback(async (petType: PetType): Promise<void> => {
    if (!userId) return
    // Optimistic
    setPet(prev => prev ? { ...prev, pet_type: petType } : null)
    try {
      await apiFetch('/api/pet', {
        method: 'POST',
        body:   JSON.stringify({ pet_type: petType }),
      })
    } catch {}
  }, [userId])

  return { pet, loading, refresh, awardXP, buyEgg, hatch, unlock, switchActive }
}
