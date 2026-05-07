import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, PanResponder, View } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { setupNotificationChannels, requestNotificationPermissions } from '../lib/notifications';
import { logAuditEvent } from '../lib/audit';
import { clearConsentCache } from '../lib/consent';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

function RootLayoutNav({ session }: { session: Session | null }) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="medicine/add" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="medicine/edit" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="medicine/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="family" options={{ headerShown: false }} />
      <Stack.Screen name="family/add" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="family/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="reports/pdf" options={{ headerShown: false }} />
      <Stack.Screen name="reports/charts" options={{ headerShown: false }} />
      <Stack.Screen name="journal" options={{ headerShown: false }} />
      <Stack.Screen name="journal/add" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="caregiver" options={{ headerShown: false }} />
      <Stack.Screen name="caregiver/invite" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="caregiver/accept" options={{ headerShown: false }} />
      <Stack.Screen name="caregiver/dashboard" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const splashReady = authLoaded && minTimePassed;

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (!sessionRef.current) return;
    inactivityTimer.current = setTimeout(async () => {
      await logAuditEvent('SESSION_TIMEOUT', 'auth');
      await supabase.auth.signOut();
    }, INACTIVITY_TIMEOUT_MS);
  };

  // PanResponder captures any touch to reset the inactivity clock
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetInactivityTimer();
        return false;
      },
    })
  ).current;

  useEffect(() => {
    setupNotificationChannels();
    requestNotificationPermissions();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      sessionRef.current = session;
      setAuthLoaded(true);
      if (session) resetInactivityTimer();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      sessionRef.current = session;
      if (session) {
        resetInactivityTimer();
        if (event === 'SIGNED_IN') logAuditEvent('LOGIN', 'auth');
      } else {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        if (event === 'SIGNED_OUT') {
          logAuditEvent('LOGOUT', 'auth');
          clearConsentCache();
        }
      }
    });

    // Auto-logout when app is backgrounded for more than 15 minutes
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        resetInactivityTimer();
      } else {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Minimum display time so animations fully play
    const timer = setTimeout(() => setMinTimePassed(true), 2200);

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
      clearTimeout(timer);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  if (showSplash) {
    return (
      <AnimatedSplash
        ready={splashReady}
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <RootLayoutNav session={session} />
    </View>
  );
}
