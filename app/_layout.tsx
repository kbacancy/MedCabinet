import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { setupNotificationChannels, requestNotificationPermissions } from '../lib/notifications';

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
      <Stack.Screen name="family/index" options={{ headerShown: false }} />
      <Stack.Screen name="family/add" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="family/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="reports/pdf" options={{ headerShown: false }} />
      <Stack.Screen name="reports/charts" options={{ headerShown: false }} />
      <Stack.Screen name="journal/index" options={{ headerShown: false }} />
      <Stack.Screen name="journal/add" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="caregiver/index" options={{ headerShown: false }} />
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

  const splashReady = authLoaded && minTimePassed;

  useEffect(() => {
    setupNotificationChannels();
    requestNotificationPermissions();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Minimum display time so animations fully play
    const timer = setTimeout(() => setMinTimePassed(true), 2200);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
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

  return <RootLayoutNav session={session} />;
}
