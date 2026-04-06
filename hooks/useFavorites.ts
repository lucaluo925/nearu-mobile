/**
 * useFavorites — favorites state for the NearU mobile app.
 *
 * Routes all reads and writes through the deployed NearU web API
 * (/api/user/favorites) using Bearer token auth — exactly like usePet and
 * usePoints. The web API handles the underlying Supabase tables, RLS, and
 * graceful degradation when the migration hasn't been run yet.
 *
 * For guests: lightweight in-memory store (no API calls, no persistence).
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export const DEFAULT_COLLECTIONS = ['Want to try', 'This week', 'Date ideas'] as const

export interface FavoritesStore {
  collections:     Record<string, string[]>
  itemCollections: Record<string, string>
}

function emptyStore(): FavoritesStore {
  const collections: Record<string, string[]> = {}
  for (const c of DEFAULT_COLLECTIONS) collections[c] = []
  return { collections, itemCollections: {} }
}

export function useFavorites(session: Session | null) {
  const [store,    setStore]    = useState<FavoritesStore>(emptyStore)
  const [loading,  setLoading]  = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const userId = session?.user?.id ?? null

  // ── Load from web API when session is available ───────────────────────────
  useEffect(() => {
    if (!userId) {
      setStore(emptyStore())
      setHydrated(true)
      return
    }

    setLoading(true)
    apiFetch('/api/user/favorites')
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          // Normalize: ensure all collection arrays contain only strings
          if (data && typeof data === 'object' && data.collections) {
            const collections = data.collections as Record<string, string[]>
            for (const key of Object.keys(collections)) {
              collections[key] = (collections[key] ?? []).filter(
                (v: unknown) => typeof v === 'string',
              )
            }
            // Ensure default collections always exist
            for (const c of DEFAULT_COLLECTIONS) {
              if (!collections[c]) collections[c] = []
            }
            setStore({
              collections,
              itemCollections: data.itemCollections ?? {},
            })
          } else {
            setStore(emptyStore())
          }
        } else {
          // 404 = tables not created yet; 401 = session expired — both: empty store
          setStore(emptyStore())
        }
      })
      .catch(() => {
        // Network error — show empty store rather than crashing
        setStore(emptyStore())
      })
      .finally(() => {
        setLoading(false)
        setHydrated(true)
      })
  }, [userId])

  // ── Derived ───────────────────────────────────────────────────────────────
  const favorites = useMemo(
    () => Object.values(store.collections).flat(),
    [store.collections],
  )

  const isFavorite = useCallback(
    (id: string) => id in store.itemCollections,
    [store.itemCollections],
  )

  // ── toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback(
    async (id: string, collection = DEFAULT_COLLECTIONS[0]) => {
      if (!userId) return // guests cannot save favorites

      const current = store.itemCollections[id]
      const isRemoving = current === collection

      // Optimistic update
      setStore((prev) => {
        const next: FavoritesStore = {
          collections:     { ...prev.collections },
          itemCollections: { ...prev.itemCollections },
        }
        if (!next.collections[collection]) next.collections[collection] = []

        if (current) {
          // Remove from current collection
          next.collections[current] = (next.collections[current] ?? []).filter(
            (i) => i !== id,
          )
          delete next.itemCollections[id]

          // If moving to a different collection, add there
          if (current !== collection) {
            next.collections[collection] = [
              ...(next.collections[collection] ?? []),
              id,
            ]
            next.itemCollections[id] = collection
          }
        } else {
          // Add to collection
          next.collections[collection] = [
            ...(next.collections[collection] ?? []),
            id,
          ]
          next.itemCollections[id] = collection
        }
        return next
      })

      // Persist via web API (fire-and-forget — optimistic update already applied)
      const body = isRemoving
        ? { action: 'remove', item_id: id }
        : { action: 'add',    item_id: id, collection_name: collection }

      apiFetch('/api/user/favorites', {
        method: 'POST',
        body:   JSON.stringify(body),
      }).catch(() => {
        // Network error — optimistic update stays; will resync on next load
      })
    },
    [userId, store.itemCollections],
  )

  return { store, favorites, loading, hydrated, isFavorite, toggle }
}
