/**
 * Favorites / Saved screen.
 * Shows saved items grouped by collection with tab switcher.
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { useFavorites, DEFAULT_COLLECTIONS } from '@/hooks/useFavorites'
import { ItemCard } from '@/components/ItemCard'
import { EmptyState } from '@/components/EmptyState'
import { supabase } from '@/lib/supabase'
import type { Item } from '@/lib/types'

export default function FavoritesScreen() {
  const router = useRouter()
  const { session, isGuest } = useSession()
  const { store, isFavorite, toggle, hydrated } = useFavorites(session)

  const [activeCollection, setActiveCollection] = useState<string>(DEFAULT_COLLECTIONS[0])
  const [itemCache, setItemCache] = useState<Record<string, Item>>({})

  // Track which IDs we have already fetched to avoid re-requesting on re-render
  const fetchedIdsRef = useRef<Set<string>>(new Set())

  const collectionNames = Object.keys(store.collections)
  const activeIds = store.collections[activeCollection] ?? []

  // Fetch full item details for any IDs not yet in cache
  useEffect(() => {
    const missing = activeIds.filter(id => !fetchedIdsRef.current.has(id))
    if (missing.length === 0) return

    supabase
      .from('items')
      .select('*')
      .in('id', missing)
      .then(({ data }) => {
        if (!data) return
        for (const item of data) fetchedIdsRef.current.add(item.id)
        setItemCache(prev => {
          const next = { ...prev }
          for (const item of data) next[item.id] = item as Item
          return next
        })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIds.join(',')])

  const activeItems = activeIds.map(id => itemCache[id]).filter(Boolean) as Item[]

  // Guest: prompt to sign in
  if (isGuest) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved</Text>
        </View>
        <EmptyState
          emoji="🔐"
          title="Sign in to save favorites"
          subtitle="Create a free account to save events and places across devices"
        />
        <View style={styles.signInContainer}>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        <Text style={styles.headerCount}>
          {Object.values(store.itemCollections).length} items
        </Text>
      </View>

      {/* Collection tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={styles.tabContent}
      >
        {collectionNames.map((name) => {
          const count = (store.collections[name] ?? []).length
          const active = activeCollection === name
          return (
            <TouchableOpacity
              key={name}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveCollection(name)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {name}
                {count > 0 ? ` · ${count}` : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Items in collection */}
      <FlatList
        data={activeItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            isFavorite={isFavorite(item.id)}
            onToggleFav={() => toggle(item.id)}
          />
        )}
        ListEmptyComponent={
          hydrated ? (
            <EmptyState
              emoji="🏷️"
              title={`Nothing in "${activeCollection}"`}
              subtitle="Tap ♡ on any listing to save it here"
            />
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
    backgroundColor:   Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.text,
  },
  headerCount: {
    fontSize: FontSize.sm,
    color:    Colors.textSecondary,
  },
  tabRow: {
    backgroundColor:  Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  tabContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    gap:               Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   8,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.chipBg,
  },
  tabActive: {
    backgroundColor: Colors.amber,
  },
  tabText: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.chipText,
  },
  tabTextActive: {
    color:      Colors.white,
    fontWeight: FontWeight.semibold,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xxl,
  },
  signInContainer: {
    paddingHorizontal: Spacing.xl,
    marginTop:         -Spacing.xl,
  },
  signInButton: {
    backgroundColor: Colors.amber,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  signInText: {
    color:      Colors.white,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
  },
})
