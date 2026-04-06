/**
 * Profile / Rewards screen.
 * Shows auth state, points, pet level, and account options.
 */

import React from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme'
import { useSession } from '@/hooks/useSession'
import { usePet } from '@/hooks/usePet'
import { usePoints } from '@/hooks/usePoints'
import { supabase } from '@/lib/supabase'
import { PET_EMOJI } from '@/lib/types'

function StatCard({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function MenuRow({
  icon, label, onPress, destructive,
}: {
  icon: string; label: string; onPress: () => void; destructive?: boolean
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={icon as React.ComponentProps<typeof Ionicons>['name']}
        size={20}
        color={destructive ? Colors.error : Colors.textSecondary}
      />
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { session, isGuest, user } = useSession()
  const { pet } = usePet(session)
  const { points } = usePoints(session)

  const emoji    = pet?.pet_type ? (PET_EMOJI[pet.pet_type as keyof typeof PET_EMOJI] ?? '🐶') : '🐶'
  const initials = user?.email?.charAt(0).toUpperCase() ?? '?'

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await supabase.auth.signOut() },
      },
    ])
  }

  // Guest view
  if (isGuest) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.guestHero}>
            <Text style={styles.guestEmoji}>🐾</Text>
            <Text style={styles.guestTitle}>Join NearU</Text>
            <Text style={styles.guestSub}>
              Save favorites, earn rewards, and unlock your personal campus companion
            </Text>
          </View>

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.signInText}>Sign In / Create Account</Text>
          </TouchableOpacity>

          <View style={styles.features}>
            {[
              ['🏷️', 'Save favorites to collections'],
              ['🐶', 'Unlock a personal pet companion'],
              ['⭐', 'Earn points for exploring'],
              ['🎯', 'Get personalized recommendations'],
            ].map(([e, t]) => (
              <View key={t} style={styles.featureRow}>
                <Text style={styles.featureEmoji}>{e}</Text>
                <Text style={styles.featureText}>{t}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Logged-in view
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar + email */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.memberSince}>NearU member</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            label="Points"
            value={String(points?.current_points ?? 0)}
            emoji="⭐"
          />
          <StatCard
            label="Pet Level"
            value={`Lv. ${pet?.level ?? 1}`}
            emoji={emoji}
          />
          <StatCard
            label="XP"
            value={String(pet?.xp ?? 0)}
            emoji="✨"
          />
        </View>

        {/* XP bar */}
        {pet && (
          <View style={styles.xpSection}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpLabel}>Level {pet.level} progress</Text>
              <Text style={styles.xpPct}>{pet.levelProgress.pct}%</Text>
            </View>
            <View style={styles.xpBarBg}>
              <View
                style={[styles.xpBarFill, {
                  width: `${Math.min(pet.levelProgress.pct, 100)}%` as `${number}%`,
                }]}
              />
            </View>
            {!pet.levelProgress.maxed && (
              <Text style={styles.xpHint}>
                {pet.levelProgress.needed - pet.levelProgress.current} XP to level up
              </Text>
            )}
          </View>
        )}

        {/* Menu */}
        <View style={styles.menu}>
          <MenuRow
            icon="paw-outline"
            label="My Pet"
            onPress={() => router.push('/(tabs)/pet')}
          />
          <MenuRow
            icon="bookmark-outline"
            label="Saved Places"
            onPress={() => router.push('/(tabs)/favorites')}
          />
          <MenuRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          />
        </View>

        <Text style={styles.version}>NearU v1.0 · UC Davis</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.lg },

  avatarSection: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md },
  avatar: {
    width:           72,
    height:          72,
    borderRadius:    Radius.full,
    backgroundColor: Colors.amber,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText:   { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.white },
  email:        { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  memberSince:  { fontSize: FontSize.sm, color: Colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex:            1,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    alignItems:      'center',
    gap:             4,
    ...Shadow.sm,
  },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center' },

  xpSection: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.xs,
    ...Shadow.sm,
  },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel:  { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  xpPct:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.amber },
  xpBarBg: {
    height:          10,
    backgroundColor: Colors.borderLight,
    borderRadius:    Radius.full,
    overflow:        'hidden',
  },
  xpBarFill: {
    height:          '100%',
    backgroundColor: Colors.amber,
    borderRadius:    Radius.full,
  },
  xpHint: { fontSize: FontSize.xs, color: Colors.textTertiary },

  menu: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    ...Shadow.sm,
  },
  menuRow: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    flex:     1,
    fontSize: FontSize.base,
    color:    Colors.text,
  },
  menuLabelDestructive: { color: Colors.error },
  version: {
    textAlign: 'center',
    fontSize:  FontSize.xs,
    color:     Colors.textTertiary,
  },

  // Guest
  guestHero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  guestEmoji:{ fontSize: 64 },
  guestTitle:{ fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
  guestSub:  { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  signInBtn: {
    backgroundColor: Colors.amber,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  signInText:  { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  features:    { gap: Spacing.md },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureEmoji:{ fontSize: 24 },
  featureText: { fontSize: FontSize.base, color: Colors.text },
})
