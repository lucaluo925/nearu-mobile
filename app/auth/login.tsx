/**
 * Auth screen — email/password sign-in and sign-up.
 * Presented as a modal from any screen that requires login.
 */

import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function LoginScreen() {
  const router = useRouter()
  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password')
      return
    }
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) { setError(err.message); return }
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) { setError(err.message); return }
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. You can log in after confirming.',
        )
        setMode('login')
        return
      }
      router.back()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🐾 NearU</Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Welcome back! Sign in to your account.'
                : 'Create a free account to get started.'}
            </Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => { setMode('login'); setError(null) }}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
              onPress={() => { setMode('signup'); setError(null) }}
            >
              <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                autoComplete={mode === 'signup' ? 'new-password' : 'password'}
              />
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.submitText}>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            By continuing you agree to NearU's terms of service.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  kav:     { flex: 1 },
  content: {
    padding:       Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap:           Spacing.lg,
  },

  header: { alignItems: 'center', gap: Spacing.sm },
  logo:   { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: {
    fontSize:  FontSize.base,
    color:     Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  modeToggle: {
    flexDirection:   'row',
    backgroundColor: Colors.chipBg,
    borderRadius:    Radius.md,
    padding:         4,
  },
  modeBtn: {
    flex:           1,
    paddingVertical: Spacing.sm,
    borderRadius:   Radius.sm,
    alignItems:     'center',
  },
  modeBtnActive: { backgroundColor: Colors.white },
  modeBtnText:   { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  modeBtnTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },

  form: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semibold,
    color:      Colors.textSecondary,
  },
  input: {
    backgroundColor:   Colors.surface,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical:   14,
    fontSize:          FontSize.base,
    color:             Colors.text,
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    borderWidth:     1,
    borderColor:     '#FCA5A5',
  },
  errorText: { fontSize: FontSize.sm, color: Colors.error },

  submitBtn: {
    backgroundColor: Colors.amber,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
    marginTop:       Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: {
    color:      Colors.white,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
  },

  footer: {
    fontSize:  FontSize.xs,
    color:     Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
})
