import React from 'react'
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme'
import type { Item } from '@/lib/types'
import { CATEGORY_EMOJI } from '@/lib/types'

interface Props {
  item:        Item
  isFavorite:  boolean
  onToggleFav: (id: string) => void
  reason?:     string | null
}

function formatTime(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today    = new Date()
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1)
  const isToday    = d.toDateString() === today.toDateString()
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday)    return `Today, ${time}`
  if (isTomorrow) return `Tomorrow, ${time}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${time}`
}

export function ItemCard({ item, isFavorite, onToggleFav, reason }: Props) {
  const router = useRouter()
  const emoji  = CATEGORY_EMOJI[item.category] ?? '📍'

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {item.flyer_image_url ? (
          <Image
            source={{ uri: item.flyer_image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.fallbackEmoji}>{emoji}</Text>
          </View>
        )}

        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {emoji} {item.category}
          </Text>
        </View>

        {/* Favorite button */}
        <TouchableOpacity
          style={styles.favButton}
          onPress={() => onToggleFav(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? Colors.error : Colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

        {item.start_time && (
          <View style={styles.row}>
            <Ionicons name="time-outline" size={13} color={Colors.amber} />
            <Text style={styles.meta}> {formatTime(item.start_time)}</Text>
          </View>
        )}

        <View style={styles.row}>
          <Ionicons name="location-outline" size={13} color={Colors.textTertiary} />
          <Text style={styles.meta} numberOfLines={1}>
            {' '}{item.location_name ?? item.address}
          </Text>
        </View>

        {/* Bottom row: rating + reason */}
        <View style={styles.bottomRow}>
          {(item.avg_rating ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={Colors.amber} />
              <Text style={styles.rating}> {item.avg_rating?.toFixed(1)}</Text>
              {(item.review_count ?? 0) > 0 && (
                <Text style={styles.reviewCount}> ({item.review_count})</Text>
              )}
            </View>
          )}
          {reason && (
            <View style={styles.reasonBadge}>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    marginBottom:    Spacing.md,
    overflow:        'hidden',
    ...Shadow.md,
  },
  imageContainer: {
    position: 'relative',
    height:   180,
  },
  image: {
    width:  '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: Colors.amberLight,
    alignItems:      'center',
    justifyContent:  'center',
  },
  fallbackEmoji: {
    fontSize: 52,
  },
  categoryBadge: {
    position:        'absolute',
    bottom:          Spacing.sm,
    left:            Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   3,
  },
  categoryText: {
    color:      Colors.white,
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: 'capitalize',
  },
  favButton: {
    position:        'absolute',
    top:             Spacing.sm,
    right:           Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius:    Radius.full,
    width:  36,
    height: 36,
    alignItems:      'center',
    justifyContent:  'center',
  },
  content: {
    padding: Spacing.md,
    gap:     Spacing.xs,
  },
  title: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semibold,
    color:      Colors.text,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  meta: {
    fontSize: FontSize.sm,
    color:    Colors.textSecondary,
    flex:     1,
  },
  bottomRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  rating: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semibold,
    color:      Colors.text,
  },
  reviewCount: {
    fontSize: FontSize.sm,
    color:    Colors.textTertiary,
  },
  reasonBadge: {
    backgroundColor: Colors.amberLight,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
  },
  reasonText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
    color:      Colors.amberDark,
  },
})
