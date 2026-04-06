import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme'

interface Props {
  emoji?:    string
  title:     string
  subtitle?: string
}

export function EmptyState({ emoji = '🔍', title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.xxl,
  },
  emoji: {
    fontSize:     52,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.semibold,
    color:      Colors.text,
    textAlign:  'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize:  FontSize.base,
    color:     Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})
