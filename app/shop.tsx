/**
 * Rewards Shop — Pet eggs, pet unlocks, and point history.
 *
 * Accessible from the Profile tab → "Rewards Shop".
 * Sections:
 *   1. Balance bar      — current points + egg count
 *   2. Egg Hatch card   — buy egg (40 pts) + hatch into random pet
 *   3. Pet Collection   — 3-column grid; unlock or set active
 *   4. Point History    — recent earn/spend events
 */

import React, { useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Animated,
  StyleSheet, Alert, ActivityIndicator, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme'
import { useSessionContext } from '@/lib/SessionContext'
import { usePet } from '@/hooks/usePet'
import { usePoints } from '@/hooks/usePoints'
import {
  PET_TYPES, PET_EMOJI, PET_LABEL, PET_PRICES, PET_RARITY,
  RARITY_LABEL, RARITY_COLORS, EGG_PRICE, drawHatch, type PetType,
} from '@/lib/types'

const SCREEN_W = Dimensions.get('window').width
const CARD_W   = Math.floor((SCREEN_W - Spacing.md * 2 - Spacing.sm * 2) / 3)

// ── Sub-components ────────────────────────────────────────────────────────────

function BalanceBar({ pts, eggs }: { pts: number; eggs: number }) {
  return (
    <View style={styles.balanceBar}>
      <View style={styles.balancePill}>
        <Text style={styles.balanceEmoji}>⭐</Text>
        <Text style={styles.balanceVal}>{pts}</Text>
        <Text style={styles.balanceLbl}>pts</Text>
      </View>
      <View style={styles.balanceDivider} />
      <View style={styles.balancePill}>
        <Text style={styles.balanceEmoji}>🥚</Text>
        <Text style={styles.balanceVal}>{eggs}</Text>
        <Text style={styles.balanceLbl}>{eggs === 1 ? 'egg' : 'eggs'}</Text>
      </View>
    </View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diffMs / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { session, isGuest } = useSessionContext()
  const { pet, buyEgg, hatch, unlock, switchActive, refresh: refreshPet } = usePet(session)
  const { points, loading: ptsLoading, refresh: refreshPoints } = usePoints(session)

  // Hatch modal state
  const [modalVisible, setModalVisible]   = useState(false)
  const [hatching,     setHatching]       = useState(false)
  const [hatchResult,  setHatchResult]    = useState<PetType | null>(null)
  const shakeAnim  = useRef(new Animated.Value(0)).current
  const revealAnim = useRef(new Animated.Value(0)).current

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.guestCenter}>
          <Text style={styles.guestEmoji}>🔒</Text>
          <Text style={styles.guestTitle}>Sign in to access the Rewards Shop</Text>
        </View>
      </SafeAreaView>
    )
  }

  const currentPts  = points?.current_points ?? 0
  const eggCount    = pet?.egg_count        ?? 0
  const unlockedSet = new Set(pet?.unlocked_pets ?? ['dog'])
  const activePet   = pet?.pet_type ?? 'dog'

  // ── Buy egg ───────────────────────────────────────────────────────────────
  async function handleBuyEgg() {
    if (currentPts < EGG_PRICE) {
      Alert.alert(
        'Not enough points',
        `You need ${EGG_PRICE} pts to buy an egg. You have ${currentPts} pts.`,
      )
      return
    }
    Alert.alert(
      'Buy Egg',
      `Spend ${EGG_PRICE} pts to get a random pet egg?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            const result = await buyEgg()
            if (result.ok) {
              await refreshPoints()
            } else {
              Alert.alert('Purchase failed', result.error)
            }
          },
        },
      ],
    )
  }

  // ── Hatch flow ────────────────────────────────────────────────────────────
  function handleHatchTap() {
    if (eggCount < 1) {
      Alert.alert('No eggs', 'Buy an egg first!')
      return
    }
    const drawn = drawHatch()
    setHatchResult(null)
    setHatching(true)
    setModalVisible(true)
    shakeAnim.setValue(0)
    revealAnim.setValue(0)

    // Shake the egg
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -12, duration: 90,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  12, duration: 90,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  -8, duration: 80,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   8, duration: 80,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  -4, duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 60,  useNativeDriver: true }),
    ]).start()

    // After 1.4 s confirm with server then reveal
    setTimeout(async () => {
      const result = await hatch(drawn)
      if (result.ok) {
        setHatchResult(drawn)
        setHatching(false)
        Animated.spring(revealAnim, {
          toValue: 1, friction: 5, tension: 80, useNativeDriver: true,
        }).start()
        await refreshPoints()
      } else {
        setModalVisible(false)
        setHatching(false)
        Alert.alert('Hatch failed', result.error)
      }
    }, 1400)
  }

  function closeHatchModal() {
    setModalVisible(false)
    setHatchResult(null)
  }

  // ── Unlock pet ────────────────────────────────────────────────────────────
  async function handleUnlock(petType: PetType) {
    const price = PET_PRICES[petType]
    if (currentPts < price) {
      Alert.alert(
        'Not enough points',
        `You need ${price} pts to unlock ${PET_LABEL[petType]}. You have ${currentPts} pts.`,
      )
      return
    }
    Alert.alert(
      `Unlock ${PET_LABEL[petType]}`,
      `Spend ${price} pts to unlock this companion?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            const result = await unlock(petType)
            if (result.ok) {
              await refreshPoints()
            } else {
              Alert.alert('Unlock failed', result.error)
            }
          },
        },
      ],
    )
  }

  // ── Switch active pet ─────────────────────────────────────────────────────
  async function handleSetActive(petType: PetType) {
    await switchActive(petType)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Balance bar */}
        <BalanceBar pts={currentPts} eggs={eggCount} />

        {/* ── Egg Hatch section ────────────────────────────────────────── */}
        <SectionHeader title="🥚  Pet Eggs" />
        <View style={styles.eggCard}>
          <View style={styles.eggLeft}>
            <Text style={styles.eggEmoji}>🥚</Text>
          </View>
          <View style={styles.eggRight}>
            <Text style={styles.eggTitle}>Random Companion</Text>
            <Text style={styles.eggDesc}>
              Each egg hatches into a random pet.{'\n'}
              Common 65% · Rare 25% · Epic 8% · Legendary 2%
            </Text>
            <View style={styles.eggButtons}>
              <TouchableOpacity
                style={[styles.eggBtn, styles.eggBtnBuy]}
                onPress={handleBuyEgg}
                activeOpacity={0.8}
              >
                <Text style={styles.eggBtnBuyText}>Buy Egg  •  {EGG_PRICE} pts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.eggBtn, styles.eggBtnHatch, eggCount === 0 && styles.eggBtnDisabled]}
                onPress={handleHatchTap}
                activeOpacity={0.8}
                disabled={eggCount === 0}
              >
                <Text style={[styles.eggBtnHatchText, eggCount === 0 && styles.eggBtnDisabledText]}>
                  Hatch  🥚×{eggCount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Pet Collection section ───────────────────────────────────── */}
        <SectionHeader title="🐾  Pet Collection" />
        <View style={styles.petGrid}>
          {PET_TYPES.map((petType) => {
            const rarity   = PET_RARITY[petType]
            const rc       = RARITY_COLORS[rarity]
            const price    = PET_PRICES[petType]
            const owned    = unlockedSet.has(petType)
            const isActive = petType === activePet
            const canAfford = currentPts >= price

            return (
              <View
                key={petType}
                style={[
                  styles.petCard,
                  { width: CARD_W, borderColor: isActive ? Colors.amber : rc.border },
                  isActive && styles.petCardActive,
                ]}
              >
                {/* Rarity badge */}
                <View style={[styles.rarityBadge, { backgroundColor: rc.bg }]}>
                  <Text style={[styles.rarityText, { color: rc.text }]}>
                    {RARITY_LABEL[rarity]}
                  </Text>
                </View>

                {/* Emoji */}
                <Text style={styles.petGridEmoji}>{PET_EMOJI[petType]}</Text>
                <Text style={styles.petGridName}>{PET_LABEL[petType]}</Text>

                {/* Action */}
                {isActive ? (
                  <View style={styles.petActiveBadge}>
                    <Text style={styles.petActiveBadgeText}>Active</Text>
                  </View>
                ) : owned ? (
                  <TouchableOpacity
                    style={styles.petSetBtn}
                    onPress={() => handleSetActive(petType)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.petSetBtnText}>Set Active</Text>
                  </TouchableOpacity>
                ) : price === 0 ? (
                  <TouchableOpacity
                    style={styles.petSetBtn}
                    onPress={() => handleSetActive(petType)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.petSetBtnText}>Free</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.petUnlockBtn, !canAfford && styles.petUnlockBtnDim]}
                    onPress={() => handleUnlock(petType)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.petUnlockBtnText}>{price} pts</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>

        {/* ── Point History section ────────────────────────────────────── */}
        <SectionHeader title="📜  Point History" />
        {ptsLoading ? (
          <ActivityIndicator color={Colors.amber} style={{ marginVertical: Spacing.lg }} />
        ) : (points?.history?.length ?? 0) === 0 ? (
          <View style={styles.historyEmpty}>
            <Text style={styles.historyEmptyText}>No activity yet — start exploring to earn points!</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {(points?.history ?? []).map((evt) => (
              <View key={evt.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyLabel}>{evt.label}</Text>
                  <Text style={styles.historyTime}>{timeAgo(evt.created_at)}</Text>
                </View>
                <Text style={[
                  styles.historyPts,
                  evt.points >= 0 ? styles.historyPtsEarn : styles.historyPtsSpend,
                ]}>
                  {evt.points >= 0 ? '+' : ''}{evt.points}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ── Hatch modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeHatchModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {hatching ? (
              <>
                <Animated.Text
                  style={[styles.modalEgg, { transform: [{ translateX: shakeAnim }] }]}
                >
                  🥚
                </Animated.Text>
                <Text style={styles.modalHatchingText}>Cracking…</Text>
              </>
            ) : hatchResult ? (
              <>
                <Animated.View style={{
                  opacity: revealAnim,
                  transform: [{ scale: revealAnim.interpolate({ inputRange: [0,1], outputRange: [0.5, 1] }) }],
                  alignItems: 'center',
                }}>
                  <Text style={styles.modalResultEmoji}>{PET_EMOJI[hatchResult]}</Text>
                  <View style={[
                    styles.rarityBadge,
                    { backgroundColor: RARITY_COLORS[PET_RARITY[hatchResult]].bg, marginBottom: Spacing.sm },
                  ]}>
                    <Text style={[styles.rarityText, { color: RARITY_COLORS[PET_RARITY[hatchResult]].text }]}>
                      {RARITY_LABEL[PET_RARITY[hatchResult]]}
                    </Text>
                  </View>
                  <Text style={styles.modalResultName}>{PET_LABEL[hatchResult]}</Text>
                  <Text style={styles.modalResultSub}>Your new active companion!</Text>
                </Animated.View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={closeHatchModal}>
                  <Text style={styles.modalCloseBtnText}>Nice! 🎉</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, gap: Spacing.md },

  // Balance bar
  balanceBar: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.md,
    ...Shadow.sm,
  },
  balancePill:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceEmoji:   { fontSize: 22 },
  balanceVal:     { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  balanceLbl:     { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  balanceDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  // Section headers
  sectionHeader: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      Colors.text,
    marginTop:  Spacing.sm,
  },

  // Egg card
  eggCard: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.md,
    ...Shadow.sm,
  },
  eggLeft:  { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  eggEmoji: { fontSize: 48 },
  eggRight: { flex: 1, gap: Spacing.sm },
  eggTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  eggDesc:  { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  eggButtons: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  eggBtn: {
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical:   8,
    alignItems:        'center',
  },
  eggBtnBuy:          { backgroundColor: Colors.amber },
  eggBtnBuyText:      { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  eggBtnHatch:        { backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber },
  eggBtnHatchText:    { color: Colors.amberDark, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  eggBtnDisabled:     { opacity: 0.4 },
  eggBtnDisabledText: { color: Colors.textTertiary },

  // Pet grid
  petGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  petCard: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    borderWidth:     1.5,
    padding:         Spacing.sm,
    alignItems:      'center',
    gap:             4,
    ...Shadow.sm,
  },
  petCardActive: { borderColor: Colors.amber, backgroundColor: '#FFFBEB' },

  rarityBadge: {
    borderRadius:      Radius.full,
    paddingHorizontal: 6,
    paddingVertical:   2,
    alignSelf:         'center',
  },
  rarityText:    { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.3 },

  petGridEmoji: { fontSize: 30, marginVertical: 2 },
  petGridName:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text },

  petActiveBadge: {
    backgroundColor: Colors.amber,
    borderRadius:    Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  petActiveBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white },

  petSetBtn: {
    backgroundColor:   Colors.amberLight,
    borderRadius:      Radius.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
    marginTop:         2,
  },
  petSetBtnText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.amberDark },

  petUnlockBtn: {
    backgroundColor:   Colors.surface,
    borderRadius:      Radius.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
    marginTop:         2,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  petUnlockBtnDim:  { opacity: 0.5 },
  petUnlockBtnText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textSecondary },

  // History
  historyEmpty: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    alignItems:      'center',
  },
  historyEmptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  historyList: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    ...Shadow.sm,
  },
  historyRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  historyLeft:     { flex: 1, gap: 2 },
  historyLabel:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  historyTime:     { fontSize: FontSize.xs, color: Colors.textTertiary },
  historyPts:      { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  historyPtsEarn:  { color: Colors.success },
  historyPtsSpend: { color: Colors.error },

  // Hatch modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    alignItems:      'center',
    width:           '100%',
    maxWidth:        320,
    gap:             Spacing.md,
    ...Shadow.md,
  },
  modalEgg:         { fontSize: 80 },
  modalHatchingText:{ fontSize: FontSize.base, color: Colors.textSecondary, fontStyle: 'italic' },
  modalResultEmoji: { fontSize: 80, marginBottom: Spacing.sm },
  modalResultName:  { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  modalResultSub:   { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  modalCloseBtn: {
    backgroundColor: Colors.amber,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.sm,
    marginTop:         Spacing.sm,
  },
  modalCloseBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },

  // Guest state
  guestCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  guestEmoji:  { fontSize: 48 },
  guestTitle:  { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
})
