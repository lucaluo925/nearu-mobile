import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme'
import type { PetState } from '@/hooks/usePet'
import { PET_EMOJI } from '@/lib/types'

interface Props {
  pet:     PetState | null
  isGuest: boolean
  prompt?: string
}

const GUEST_PROMPT = 'Meet your campus companion 🐾'
const DEFAULT_PROMPT = 'Tap to explore with me!'

const MOOD_MESSAGES: Record<string, string> = {
  excited: "I'm pumped! Let's find something fun 🎉",
  happy:   "Happy to help! What are you looking for?",
  idle:    "I miss you! Come explore with me 🐾",
}

export function PetBubble({ pet, isGuest, prompt }: Props) {
  const router = useRouter()
  const emoji  = pet?.pet_type ? (PET_EMOJI[pet.pet_type as keyof typeof PET_EMOJI] ?? '🐶') : '🐶'
  const message = prompt
    ?? (pet ? MOOD_MESSAGES[pet.mood] : isGuest ? GUEST_PROMPT : DEFAULT_PROMPT)

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={() => router.push('/(tabs)/pet')}
    >
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
        <Text style={styles.cta}>Ask me anything →</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.amberLight,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.md,
    marginBottom:    Spacing.md,
    borderWidth:     1,
    borderColor:     '#FDE68A',
    ...Shadow.sm,
  },
  emojiCircle: {
    width:          52,
    height:         52,
    borderRadius:   Radius.full,
    backgroundColor: Colors.amber,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  emoji: {
    fontSize: 28,
  },
  bubble: {
    flex: 1,
    gap:  2,
  },
  message: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.medium,
    color:      '#78350F',
    lineHeight: 20,
  },
  cta: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semibold,
    color:      Colors.amber,
    marginTop:  2,
  },
})
