/**
 * Listing detail screen — stack nav with transparent header.
 * Full item info: hero image, time, location, tags, favorite action.
 */

import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Linking, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { useFavorites } from '@/hooks/useFavorites'
import { supabase } from '@/lib/supabase'
import type { Item } from '@/lib/types'
import { CATEGORY_EMOJI } from '@/lib/types'

function formatFullDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, isGuest } = useSession()
  const { isFavorite, toggle } = useFavorites(session)

  const [item,    setItem]    = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setItem(data as Item | null)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.amber} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Item not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const emoji     = CATEGORY_EMOJI[item.category] ?? '📍'
  const faved     = isFavorite(item.id)
  const hasLink   = !!item.external_link
  const hasImage  = !!item.flyer_image_url

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero image */}
        <View style={styles.hero}>
          {hasImage ? (
            <Image
              source={{ uri: item.flyer_image_url! }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <Text style={styles.heroEmoji}>{emoji}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Category + rating */}
          <View style={styles.metaRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{emoji} {item.category}</Text>
            </View>
            {(item.avg_rating ?? 0) > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={Colors.amber} />
                <Text style={styles.ratingText}> {item.avg_rating?.toFixed(1)}</Text>
                {(item.review_count ?? 0) > 0 && (
                  <Text style={styles.reviewCount}> ({item.review_count})</Text>
                )}
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Date/time */}
          {item.start_time && (
            <View style={styles.infoCard}>
              <Ionicons name="calendar-outline" size={18} color={Colors.amber} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{formatFullDate(item.start_time)}</Text>
                <Text style={styles.infoSub}>
                  {formatTime(item.start_time)}
                  {item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Location */}
          <View style={styles.infoCard}>
            <Ionicons name="location-outline" size={18} color={Colors.amber} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>{item.location_name ?? item.address}</Text>
              {item.location_name && item.address !== item.location_name && (
                <Text style={styles.infoSub}>{item.address}</Text>
              )}
            </View>
          </View>

          {/* Description */}
          {item.description && (
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>About</Text>
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          )}

          {/* Tags */}
          {(item.tags ?? []).length > 0 && (
            <View style={styles.tagsSection}>
              <View style={styles.tagsRow}>
                {(item.tags ?? []).map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {/* Favorite */}
            <TouchableOpacity
              style={[styles.actionBtn, faved && styles.actionBtnActive]}
              onPress={() => {
                if (!isGuest) toggle(item.id)
              }}
            >
              <Ionicons
                name={faved ? 'heart' : 'heart-outline'}
                size={20}
                color={faved ? Colors.error : Colors.textSecondary}
              />
              <Text style={[styles.actionText, faved && styles.actionTextActive]}>
                {faved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>

            {/* External link */}
            {hasLink && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={() => Linking.openURL(item.external_link!)}
              >
                <Ionicons name="open-outline" size={20} color={Colors.white} />
                <Text style={[styles.actionText, { color: Colors.white }]}>More Info</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.surface },
  content: { paddingBottom: Spacing.xxl },

  hero: { width: '100%', height: 280 },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: {
    backgroundColor: Colors.amberLight,
    alignItems:      'center',
    justifyContent:  'center',
  },
  heroEmoji: { fontSize: 80 },

  body: { padding: Spacing.md, gap: Spacing.md },

  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  categoryChip: {
    backgroundColor:   Colors.amberLight,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   4,
  },
  categoryText: {
    fontSize:      FontSize.sm,
    fontWeight:    FontWeight.medium,
    color:         Colors.amberDark,
    textTransform: 'capitalize',
  },
  ratingRow:   { flexDirection: 'row', alignItems: 'center' },
  ratingText:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  reviewCount: { fontSize: FontSize.sm, color: Colors.textTertiary },

  title: {
    fontSize:   FontSize.xxl,
    fontWeight: FontWeight.bold,
    color:      Colors.text,
    lineHeight: 34,
  },

  infoCard: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             Spacing.md,
    backgroundColor: Colors.background,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
  },
  infoText:  { flex: 1, gap: 2 },
  infoLabel: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.text },
  infoSub:   { fontSize: FontSize.sm, color: Colors.textSecondary },

  descSection: { gap: Spacing.sm },
  descTitle:   { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  descText:    { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 24 },

  tagsSection: { gap: Spacing.sm },
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    backgroundColor:   Colors.chipBg,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   4,
  },
  tagText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    backgroundColor: Colors.surface,
  },
  actionBtnActive:  { borderColor: Colors.error, backgroundColor: '#FFF5F5' },
  actionBtnPrimary: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  actionText:       { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  actionTextActive: { color: Colors.error },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: FontSize.lg, color: Colors.textSecondary },
})
