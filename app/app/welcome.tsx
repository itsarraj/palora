import { useState } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GoogleIcon,
  PaloraLogo,
  WelcomeHeroGraphic,
} from '@/components/icons';
import { useGoogleLogin } from '@/hooks/useAuth';
import { colors } from '@/constants/theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const google = useGoogleLogin();
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setError(null);
    try {
      await google.mutateAsync();
      router.replace('/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 items-center justify-center px-10">
        <View className="mb-6 flex-row items-center justify-center gap-2.5">
          <PaloraLogo size={36} />
          <Text className="text-3xl font-extrabold tracking-tight text-fz-plum">Palora</Text>
        </View>

        <WelcomeHeroGraphic width={260} height={240} />
        <Text className="mt-8 text-center text-3xl font-semibold leading-9 text-fz-ink">
          Let’s meet new people around you
        </Text>

        <View className="mt-10 flex-col items-center justify-center gap-4">
          <Pressable
            onPress={() => router.push('/login')}
            className="h-14 w-[295px] items-center justify-center rounded-[32px] shadow-sm active:opacity-90"
            style={{ backgroundColor: colors.plum }}>
            <Text className="text-center text-base font-semibold text-white">
              Login with Email
            </Text>
          </Pressable>

          <Pressable
            onPress={onGoogle}
            disabled={google.isPending}
            className="h-14 w-[295px] flex-row items-center justify-center gap-2.5 rounded-[32px] border border-fz-border bg-white px-6 shadow-sm active:opacity-90"
            style={{
              opacity: google.isPending ? 0.6 : 1,
            }}>
            <GoogleIcon size={20} />
            <Text className="text-center text-base font-semibold text-fz-plum">
              {google.isPending ? 'Opening Google…' : 'Login with Google'}
            </Text>
          </Pressable>
        </View>

        {error ? <Text className="mt-4 text-center text-sm text-red-500">{error}</Text> : null}
      </View>

      <View className="mb-4 flex-row items-center justify-center gap-1">
        <Text className="text-sm text-fz-ink/70">Don’t have an account? </Text>
        <Link href="/register" asChild>
          <Pressable>
            <Text className="text-sm text-fz-pink">Sign Up</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
