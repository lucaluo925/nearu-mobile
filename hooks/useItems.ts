/**
 * useItems — fetches listings/events from Supabase directly.
 * Mirrors the filtering logic in the web app's GET /api/items route.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Item } from '@/lib/types'

export interface ItemFilters {
  category?:   string
  search?:     string
  tags?:       string[]
  time?:       'today' | 'tomorrow' | 'this-week' | null
  sort?:       'upcoming' | 'newest' | 'top-rated'
  limit?:      number
}

export function useItems(filters: ItemFilters = {}) {
  const [items,   setItems]   = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('items')
        .select('*')
        .is('deleted_at', null)
        .eq('status', 'approved')

      if (filters.category) q = q.eq('category', filters.category)

      if (filters.search) {
        q = q.or(
          `title.ilike.%${filters.search}%,address.ilike.%${filters.search}%,location_name.ilike.%${filters.search}%`,
        )
      }

      if (filters.tags && filters.tags.length > 0) {
        q = q.overlaps('tags', filters.tags)
      }

      // Past-event filter: events with a start_time must be within 6-hour buffer
      const cutoff6h = new Date(Date.now() - 6 * 3600 * 1000).toISOString()
      q = q.or(`start_time.is.null,start_time.gte.${cutoff6h}`)

      // Time filters
      const now = new Date().toISOString()
      if (filters.time === 'today') {
        const eod = endOfLADay(new Date(), 0)
        q = q.gte('start_time', now).lte('start_time', eod.toISOString())
      } else if (filters.time === 'tomorrow') {
        const sol = startOfLADay(new Date(), 1)
        const eol = endOfLADay(new Date(), 1)
        q = q.gte('start_time', sol.toISOString()).lte('start_time', eol.toISOString())
      } else if (filters.time === 'this-week') {
        const eow = endOfLADay(new Date(), 7)
        q = q.gte('start_time', now).lte('start_time', eow.toISOString())
      }

      // Sorting
      if (filters.sort === 'newest') {
        q = q.order('created_at', { ascending: false })
      } else {
        q = q
          .order('start_time', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
      }

      const { data, error } = await q.limit(filters.limit ?? 60)
      if (error) throw error

      setItems((data ?? []) as Item[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [
    filters.category,
    filters.search,
    filters.tags?.join(','),
    filters.time,
    filters.sort,
    filters.limit,
  ])

  useEffect(() => { load() }, [load])

  return { items, loading, error, reload: load }
}

// ── LA-timezone day boundaries (matches web app utils) ────────────────────────

function probeNoonLA(date: Date, offsetDays: number): string {
  const probe = new Date(date)
  probe.setDate(probe.getDate() + offsetDays)
  probe.setHours(12, 0, 0, 0)
  return probe.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })
}

function startOfLADay(date: Date, offsetDays: number): Date {
  const noon = probeNoonLA(date, offsetDays)
  const [datePart] = noon.split(', ')
  const [m, d, y] = datePart.split('/')
  return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00-07:00`)
}

function endOfLADay(date: Date, offsetDays: number): Date {
  const noon = probeNoonLA(date, offsetDays)
  const [datePart] = noon.split(', ')
  const [m, d, y] = datePart.split('/')
  return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T23:59:59-07:00`)
}
