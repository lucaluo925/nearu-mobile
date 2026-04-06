/**
 * Home / For You feed.
 * Personalized listing feed with quick filters and pet assistant teaser.
 */

import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  TextInput, StyleSheet, RefreshControl, SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { useItems } from '@/hooks/useItems'
import { useFavorites } from '@/hooks/useFavorites'
import { usePet } from '@/hooks/usePet'
import { ItemCard } from '@/components/ItemCard'
import { FilterChip } from '@/components/FilterChip'
import { PetBubble } from '@/components/PetBubble'
import { EmptyState } from '@/components/EmptyState'
import type { TimeFilter } from '@/lib/types'
import { CATEGORY_EMOJI } from '@/lib/types'

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'All',       value: null },
  { label: 'Today',     value: 'today' },
  { label: 'Tomorrow',  value: 'tomorrow' },
  { label: 'This Week', value: 'this-week' },
]

const CATEGORIES = ['food', 'events', 'outdoor', 'study', 'campus']

export default function HomeScreen() {
  const router   = useRouter()
  const { session, isGuest } = useSession()

  const [timeFilter, setTimeFilter] = useState<TimeFilter>(null)
  const [category,   setCategory]   = useState<string | undefined>(undefined)
  const [refreshing, setRefreshing]  = useState(false)

  const { items, loading, reload } = useItems({
    time:     timeFilter ?? undefined,
    category,
    sort:     'upcoming',
    limit:    50,
  })

  const { isFavorite, toggle } = useFavorites(session)
  const { pet } = usePet(session)

  // Score items simply: events with start_time soon get boosted
  const scored = useMemo(() => {
    return [...items].sort((a, b) => {
      const boost = (item: typeof items[0]) => {
        if (!item.start_time) return 0
        const h = (new Date(item.start_time).getTime() - Date.now()) / 3_600_000
        if (h > 0 && h < 24) return 10
        if (h >= 24 && h < 72) return 5
        return 0
      }
      return boost(b) - boost(a)
    })
  }, [items])

  async function onRefresh() {
    setRefreshing(true)
    await reload()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>NearU 🐾</Text>
          <Text style={styles.headerSub}>UC Davis · What's happening</Text>
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => router.push('/(tabs)/discover')}
        >
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={scored}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} tintColor={Colors.amber} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Pet assistant teaser */}
            <PetBubble pet={pet} isGuest={isGuest} />

            {/* Time filters */}
            <Text style={styles.sectionLabel}>When?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterContent}
            >
              {TIME_FILTERS.map((f) => (
                <FilterChip
                  key={f.label}
                  label={f.label}
                  active={timeFilter === f.value}
                  onPress={() => setTimeFilter(f.value)}
                />
              ))}
            </ScrollView>

            {/* Category filters */}
            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterContent}
            >
              <FilterChip
                label="All"
                active={!category}
                onPress={() => setCategory(undefined)}
              />
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c}
                  label={c.charAt(0).toUpperCase() + c.slice(1)}
                  emoji={CATEGORY_EMOJI[c]}
                  active={category === c}
                  onPress={() => setCategory(category === c ? undefined : c)}
                />
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>
              For You {items.length > 0 ? `· ${items.length}` : ''}
            </Text>
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
              emoji="🏙️"
              title="Nothing here yet"
              subtitle="Try a different filter or check back soon"
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
  headerSub: {
    fontSize: FontSize.sm,
    color:    Colors.textSecondary,
    marginTop: 1,
  },
  searchButton: {
    width:          40,
    height:         40,
    borderRadius:   Radius.full,
    backgroundColor: Colors.chipBg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xl,
  },
  filterRow: {
    marginBottom: Spacing.md,
  },
  filterContent: {
    paddingRight: Spacing.md,
  },
  sectionLabel: {
    fontSize:     FontSize.sm,
    fontWeight:   FontWeight.semibold,
    color:        Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  Spacing.sm,
  },
})
