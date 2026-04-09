/**
 * Pet / Assistant screen.
 * Shows the pet, XP progress, mood, and intent-based recommendations.
 */

import React, { useState, useRef } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme'
import { useSessionContext } from '@/lib/SessionContext'
import { usePet } from '@/hooks/usePet'
import { useItems } from '@/hooks/useItems'
import { useFavorites } from '@/hooks/useFavorites'
import { ItemCard } from '@/components/ItemCard'
import { EmptyState } from '@/components/EmptyState'
import { parseIntent, buildIntentResponse } from '@/lib/intent-parser'
import { PET_EMOJI } from '@/lib/types'
import type { Item } from '@/lib/types'

interface ChatMessage {
  id:   string
  role: 'user' | 'assistant'
  text: string
}

function intentScore(item: Item, tags: string[], categories: string[]): number {
  let s = 0
  const itemTags = (item.tags ?? []).map(t => t.toLowerCase())
  s += itemTags.filter(t => tags.includes(t)).length * 2
  if (categories.includes(item.category)) s += 4
  if (item.start_time) {
    const h = (new Date(item.start_time).getTime() - Date.now()) / 3_600_000
    if (h > 0 && h < 24) s += 3
    else if (h >= 24 && h < 168) s += 1
  }
  return s
}

export default function PetScreen() {
  const router = useRouter()
  const { session, isGuest, loading: sessionLoading } = useSessionContext()
  const { pet, loading: petLoading, awardXP } = usePet(session)
  const { isFavorite, toggle } = useFavorites(session)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id:   'welcome',
      role: 'assistant',
      text: 'Hey! 🐾 Tell me what you\'re looking for — I\'ll find it for you!',
    },
  ])
  const [input,       setInput]       = useState('')
  const [results,     setResults]     = useState<Item[]>([])
  const [intentMsg,   setIntentMsg]   = useState<string | null>(null)
  const [searching,   setSearching]   = useState(false)

  const { items: allItems } = useItems({ limit: 100 })

  const emoji = pet?.pet_type ? (PET_EMOJI[pet.pet_type as keyof typeof PET_EMOJI] ?? '🐶') : '🐶'

  async function handleAsk() {
    const q = input.trim()
    if (!q) return

    const userMsg: ChatMessage = {
      id:   Date.now().toString(),
      role: 'user',
      text: q,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSearching(true)

    // Parse intent and score current items in-memory — no re-fetch needed
    const intent = parseIntent(q)

    // Score current items against intent
    const scored = [...allItems]
      .map(item => ({ item, score: intentScore(item, intent.tags, intent.categories) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => s.item)

    const msg = buildIntentResponse(intent, scored.length)
    setIntentMsg(msg)
    setResults(scored)
    setSearching(false)

    // Award XP for using the pet assistant — fire-and-forget
    void awardXP('share')

    const assistantMsg: ChatMessage = {
      id:   (Date.now() + 1).toString(),
      role: 'assistant',
      text: msg,
    }
    setMessages(prev => [...prev, assistantMsg])
  }

  const EXAMPLE_PROMPTS = [
    'chill spot tonight', 'free food near campus',
    'something social', 'coffee and study',
  ]

  if (sessionLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.amber} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pet Assistant</Text>
        </View>
        <ScrollView contentContainerStyle={{ flex: 1 }}>
          <EmptyState
            emoji="🐶"
            title="Meet your pet companion"
            subtitle="Sign in to unlock your personal assistant, earn XP, and get personalized recommendations"
          />
          <View style={{ paddingHorizontal: Spacing.xl, marginTop: -Spacing.xl }}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.ctaText}>Sign In to Get Started</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pet Assistant</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pet status card */}
          <View style={styles.petCard}>
            <View style={styles.petEmoji}>
              <Text style={styles.emojiText}>{emoji}</Text>
            </View>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>
                Level {pet?.level ?? 1} · {pet?.mood ?? 'idle'}
              </Text>
              {pet && (
                <View style={styles.xpBarBg}>
                  <View
                    style={[styles.xpBarFill, {
                      width: `${Math.min(pet.levelProgress.pct, 100)}%` as `${number}%`,
                    }]}
                  />
                </View>
              )}
              <Text style={styles.xpLabel}>
                {pet ? `${pet.xp} XP total` : 'Loading…'}
              </Text>
            </View>
          </View>

          {/* Chat history */}
          <View style={styles.chatArea}>
            {messages.map(m => (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text style={[
                  styles.bubbleText,
                  m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                ]}>
                  {m.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Results */}
          {results.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>Recommendations</Text>
              {results.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isFavorite={isFavorite(item.id)}
                  onToggleFav={() => toggle(item.id)}
                />
              ))}
            </View>
          )}

          {/* Example prompts */}
          {results.length === 0 && (
            <View style={styles.examples}>
              <Text style={styles.examplesTitle}>Try asking:</Text>
              <View style={styles.examplesRow}>
                {EXAMPLE_PROMPTS.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={styles.exampleChip}
                    onPress={() => { setInput(p); }}
                  >
                    <Text style={styles.exampleText}>"{p}"</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask me anything…"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="send"
              onSubmitEditing={handleAsk}
              multiline={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleAsk}
            disabled={!input.trim() || searching}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal:  Spacing.md,
    paddingVertical:    Spacing.md,
    backgroundColor:    Colors.surface,
    borderBottomWidth:  0.5,
    borderBottomColor:  Colors.border,
  },
  headerTitle: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.text,
  },
  scroll:        { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xxl,
    gap:               Spacing.md,
  },
  petCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.md,
    ...Shadow.sm,
  },
  petEmoji: {
    width:          64,
    height:         64,
    borderRadius:   Radius.full,
    backgroundColor: Colors.amberLight,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  emojiText: { fontSize: 36 },
  petInfo:   { flex: 1, gap: 4 },
  petName:   { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  xpBarBg:   {
    height:          8,
    backgroundColor: Colors.borderLight,
    borderRadius:    Radius.full,
    overflow:        'hidden',
    marginVertical:  4,
  },
  xpBarFill: {
    height:          '100%',
    backgroundColor: Colors.amber,
    borderRadius:    Radius.full,
  },
  xpLabel: { fontSize: FontSize.xs, color: Colors.textTertiary },

  chatArea: { gap: Spacing.sm },
  bubble: {
    maxWidth:      '80%',
    borderRadius:  Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
  },
  bubbleUser: {
    alignSelf:       'flex-end',
    backgroundColor: Colors.amber,
  },
  bubbleAssistant: {
    alignSelf:       'flex-start',
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  bubbleText:          { fontSize: FontSize.base, lineHeight: 20 },
  bubbleTextUser:      { color: Colors.white },
  bubbleTextAssistant: { color: Colors.text },

  resultsSection: { gap: Spacing.sm },
  resultsTitle: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semibold,
    color:      Colors.text,
  },

  examples:      { gap: Spacing.sm },
  examplesTitle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  examplesRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  exampleChip:   {
    backgroundColor:   Colors.surface,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  exampleText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  inputBar: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    backgroundColor:   Colors.surface,
    borderTopWidth:    0.5,
    borderTopColor:    Colors.border,
  },
  inputWrap: {
    flex:            1,
    backgroundColor: Colors.background,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical:   10,
  },
  textInput: {
    fontSize: FontSize.base,
    color:    Colors.text,
    padding:  0,
  },
  sendBtn: {
    width:          44,
    height:         44,
    borderRadius:   Radius.full,
    backgroundColor: Colors.amber,
    alignItems:     'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  ctaButton: {
    backgroundColor: Colors.amber,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  ctaText: {
    color:      Colors.white,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
  },
})
