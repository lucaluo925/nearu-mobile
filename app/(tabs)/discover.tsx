/**
 * Discover / Search screen.
 * Search with intent-based parsing + category browse.
 */

import React, { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme'
import { useSessionContext } from '@/lib/SessionContext'
import { useItems } from '@/hooks/useItems'
import { useFavorites } from '@/hooks/useFavorites'
import { ItemCard } from '@/components/ItemCard'
import { FilterChip } from '@/components/FilterChip'
import { EmptyState } from '@/components/EmptyState'
import { parseIntent, buildIntentResponse } from '@/lib/intent-parser'
import type { Item } from '@/lib/types'
import { CATEGORY_EMOJI } from '@/lib/types'
import { useRouter } from 'expo-router'

const CATEGORIES = [
  { value: 'food',     label: 'Food' },
  { value: 'events',   label: 'Events' },
  { value: 'outdoor',  label: 'Outdoor' },
  { value: 'study',    label: 'Study' },
  { value: 'campus',   label: 'Campus' },
  { value: 'shopping', label: 'Shopping' },
]

function intentScore(item: Item, tags: string[], categories: string[]): number {
  let s = 0
  const itemTags = (item.tags ?? []).map(t => t.toLowerCase())
  s += itemTags.filter(t => tags.includes(t)).length * 2
  if (categories.includes(item.category)) s += 4
  return s
}

export default function DiscoverScreen() {
  const router = useRouter()
  const { session, isGuest } = useSessionContext()
  const [query,    setQuery]    = useState('')
  const [submitted, setSubmitted] = useState('')
  const [category, setCategory] = useState<string | undefined>(undefined)

  // Fetch with search or category
  const { items, loading } = useItems({
    search:   submitted || undefined,
    category: category,
    limit:    80,
  })

  const { isFavorite, toggle } = useFavorites(session)

  // Parse intent from query and rank results
  const intent = useMemo(() => submitted ? parseIntent(submitted) : null, [submitted])

  const ranked = useMemo(() => {
    if (!intent || !intent.matched) return items
    const tags       = intent.tags
    const categories = intent.categories

    // Hard time filter
    let filtered = items
    if (intent.time === 'today') {
      const now     = Date.now()
      const endToday = new Date()
      endToday.setHours(23, 59, 59, 999)
      filtered = items.filter(i => {
        if (!i.start_time) return true
        const t = new Date(i.start_time).getTime()
        return t >= now && t <= endToday.getTime()
      })
    }

    return [...filtered].sort((a, b) =>
      intentScore(b, tags, categories) - intentScore(a, tags, categories),
    )
  }, [items, intent])

  const intentMsg = intent?.matched ? buildIntentResponse(intent, ranked.length) : null

  function handleSubmit() {
    Keyboard.dismiss()
    setSubmitted(query.trim())
  }

  function clearSearch() {
    setQuery('')
    setSubmitted('')
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="chill spot tonight, free food, events…"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        {query.length > 0 && (
          <TouchableOpacity style={styles.searchCta} onPress={handleSubmit}>
            <Text style={styles.searchCtaText}>Go</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* Category chips */}
            <View style={styles.chipRow}>
              <FilterChip
                label="All"
                active={!category}
                onPress={() => setCategory(undefined)}
              />
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c.value}
                  label={c.label}
                  emoji={CATEGORY_EMOJI[c.value]}
                  active={category === c.value}
                  onPress={() => setCategory(category === c.value ? undefined : c.value)}
                />
              ))}
            </View>

            {/* Intent response message */}
            {intentMsg && (
              <View style={styles.intentMsg}>
                <Text style={styles.intentText}>{intentMsg}</Text>
              </View>
            )}

            {loading && (
              <ActivityIndicator color={Colors.amber} style={{ marginVertical: Spacing.lg }} />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            isFavorite={isFavorite(item.id)}
            onToggleFav={() => {
              if (isGuest) { router.push('/auth/login'); return }
              toggle(item.id)
            }}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              emoji={submitted ? '🔍' : '✨'}
              title={submitted ? `No results for "${submitted}"` : 'Start searching'}
              subtitle={submitted
                ? 'Try "food", "events", or describe a vibe'
                : 'Type a place, event, or vibe above'}
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
    gap:              Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    backgroundColor:   Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius:    Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:   10,
  },
  input: {
    flex:     1,
    fontSize: FontSize.base,
    color:    Colors.text,
    padding:  0,
  },
  searchCta: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   10,
    backgroundColor:   Colors.amber,
    borderRadius:      Radius.md,
  },
  searchCtaText: {
    color:      Colors.white,
    fontWeight: FontWeight.bold,
    fontSize:   FontSize.base,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom:     Spacing.xxl,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap:      'nowrap',
    paddingVertical: Spacing.md,
    gap:           Spacing.xs,
  },
  intentMsg: {
    backgroundColor: Colors.amberLight,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    marginBottom:    Spacing.md,
    borderWidth:     1,
    borderColor:     '#FDE68A',
  },
  intentText: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.medium,
    color:      '#78350F',
  },
})
