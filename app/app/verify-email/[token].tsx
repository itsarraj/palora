import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authApi } from '@/services/authApi';
import { colors } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<{ status: 'pending' | 'ok' | 'error'; message: string }>({ status: 'pending', message: 'Verifying…' });

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'Missing token' });
      return;
    }
    authApi
      .verifyEmail(String(token))
      .then(() => setState({ status: 'ok', message: 'Your email is verified. You can log in now.' }))
      .catch((e) => setState({ status: 'error', message: e instanceof Error ? e.message : 'Verification failed' }));
  }, [token]);

  return (
    <View className="flex-1 items-center justify-center bg-fz-canvas px-8" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      {state.status === 'pending' ? <ActivityIndicator color={colors.plum} /> : <Text className="text-5xl">{state.status === 'ok' ? '✅' : '⚠️'}</Text>}
      <Text className="mt-6 text-2xl text-fz-plum">Verify email</Text>
      <Text className="mt-3 text-center text-base text-fz-ink">{state.message}</Text>
      <Link href="/login" className="mt-8 text-base text-fz-pink">
        Go to login
      </Link>
    </View>
  );
}
