/**
 * usePoints — rewards points for the NearU mobile app.
 * Calls the deployed web API with Bearer token auth.
 */

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export interface PointsState {
  current_points: number
  total_earned:   number
}

export function usePoints(session: Session | null) {
  const [points,  setPoints]  = useState<PointsState | null>(null)
  const [loading, setLoading] = useState(false)

  const userId = session?.user?.id ?? null

  const refresh = useCallback(async () => {
    if (!userId) { setPoints(null); return }
    setLoading(true)
    try {
      const r = await apiFetch('/api/points')
      if (r.ok) setPoints(await r.json())
    } catch {}
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  const award = useCallback(async (type: string, metadata?: Record<string, unknown>) => {
    if (!userId) return
    try {
      const r = await apiFetch('/api/points/award', {
        method: 'POST',
        body:   JSON.stringify({ type, metadata }),
      })
      if (r.ok) {
        const data = await r.json()
        setPoints((prev) => prev ? { ...prev, current_points: data.current_points ?? prev.current_points } : null)
      }
    } catch {}
  }, [userId])

  return { points, loading, refresh, award }
}
