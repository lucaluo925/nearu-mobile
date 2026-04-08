import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'
import { SessionProvider } from '@/lib/SessionContext'

// Prevent the splash screen from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <GestureHandlerRootView style={styles.root}>
      <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="item/[id]"
          options={{
            headerShown:          true,
            headerTitle:          '',
            headerBackTitle:      'Back',
            headerTransparent:    true,
            headerTintColor:      '#111827',
            headerBlurEffect:     'regular',
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            headerShown:     true,
            headerTitle:     '',
            presentation:    'modal',
            headerTintColor: '#111827',
          }}
        />
      </Stack>
      </SessionProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
