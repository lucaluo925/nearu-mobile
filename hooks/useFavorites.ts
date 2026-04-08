/**
 * useFavorites — favorites state for the NearU mobile app.
 *
 * For logged-in users: reads/writes to Supabase user_favorites table (RLS).
 * For guests: lightweight in-memory store (not persisted — favorites require login).
 *
 * Collection structure mirrors the web app's FavoritesStore exactly.
 *
 * Important: each screen that calls useFavorites gets its own instance.
 * Call reload() via useFocusEffect on the Saved screen so it stays fresh
 * after saves made from the Home or Detail screens.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
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

  // ── Load from Supabase ────────────────────────────────────────────────────
  // Exposed as `reload` so screens can call it via useFocusEffect to stay
  // in sync with saves made on other screens.

  const reload = useCallback(async () => {
    if (!userId) {
      setStore(emptyStore())
      setHydrated(true)
      return
    }

    setLoading(true)
    try {
      const [favResult, colResult] = await Promise.all([
        supabase
          .from('user_favorites')
          .select('item_id, collection_name')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('user_collections')
          .select('name')
          .eq('user_id', userId),
      ])

      const built = emptyStore()

      for (const col of (colResult.data ?? [])) {
        if (!built.collections[col.name]) built.collections[col.name] = []
      }

      for (const row of (favResult.data ?? [])) {
        if (typeof row.item_id !== 'string') continue
        const col = row.collection_name ?? DEFAULT_COLLECTIONS[0]
        if (!built.collections[col]) built.collections[col] = []
        built.collections[col].push(row.item_id)
        built.itemCollections[row.item_id] = col
      }

      setStore(built)
    } catch {
      // Network error — keep current store; user can pull-to-refresh
    } finally {
      setLoading(false)
      setHydrated(true)
    }
  }, [userId])

  useEffect(() => { reload() }, [reload])

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
  // Optimistic update with rollback on Supabase error.
  const toggle = useCallback(
    async (id: string, collection = DEFAULT_COLLECTIONS[0]) => {
      if (!userId) return // guests cannot save favorites

      const current = store.itemCollections[id]

      // Snapshot before optimistic update so we can roll back on error
      const snapshot = store

      // Optimistic update
      setStore((prev) => {
        const next: FavoritesStore = {
          collections:     { ...prev.collections },
          itemCollections: { ...prev.itemCollections },
        }
        if (!next.collections[collection]) next.collections[collection] = []

        if (current) {
          next.collections[current] = (next.collections[current] ?? []).filter(i => i !== id)
          delete next.itemCollections[id]
          if (current !== collection) {
            next.collections[collection] = [...(next.collections[collection] ?? []), id]
            next.itemCollections[id] = collection
          }
        } else {
          next.collections[collection] = [...(next.collections[collection] ?? []), id]
          next.itemCollections[id] = collection
        }
        return next
      })

      // Persist to Supabase — rollback optimistic update on error
      if (current === collection) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', id)
        if (error) setStore(snapshot)
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .upsert(
            { user_id: userId, item_id: id, collection_name: collection },
            { onConflict: 'user_id,item_id' },
          )
        if (error) setStore(snapshot)
      }
    },
    [userId, store],
  )

  return { store, favorites, loading, hydrated, isFavorite, toggle, reload }
}
