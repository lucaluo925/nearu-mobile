import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme'

interface Props {
  label:    string
  active:   boolean
  onPress:  () => void
  emoji?:   string
}

export function FilterChip({ label, active, onPress, emoji }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, active && styles.labelActive]}>
        {emoji ? `${emoji} ` : ''}{label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs + 2,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.chipBg,
    marginRight:       Spacing.sm,
  },
  chipActive: {
    backgroundColor: Colors.amber,
  },
  label: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.chipText,
  },
  labelActive: {
    color:      Colors.white,
    fontWeight: FontWeight.semibold,
  },
})
