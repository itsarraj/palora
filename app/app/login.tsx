import { useEffect, useState } from 'react';
import {
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import {
  AuthField,
  AuthPrimaryButton,
  AuthSocialButton,
  GoogleIcon,
  OrDivider,
  RememberMe,
} from '@/components/auth/AuthUi';
import { PaloraLogo } from '@/components/icons';
import { useGoogleLogin, useLogin } from '@/hooks/useAuth';
import { getRememberedEmail, setRememberedEmail } from '@/lib/auth-storage';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const login = useLogin();
  const google = useGoogleLogin();
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = login.isPending || google.isPending;

  useEffect(() => {
    getRememberedEmail().then((saved) => {
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    });
  }, []);

  const onSubmit = async () => {
    setError(null);
    try {
      await login.mutateAsync({ email: email.trim(), password });
      await setRememberedEmail(remember ? email.trim() : null);
      router.replace('/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

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
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingTop: insets.top + 24,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 16,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="gap-8">
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <PaloraLogo size={28} />
              <Text className="text-2xl font-bold text-fz-plum">Palora</Text>
            </View>
            <Text className="text-3xl font-bold leading-10 text-fz-ink">Sign in to your Account</Text>
            <Text className="text-sm text-fz-muted">Enter your email and password to log in</Text>
          </View>

          <View className="gap-6">
            <View className="gap-4">
              <AuthField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="yourname@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AuthField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secure={!showPassword}
                onToggleSecure={() => setShowPassword((v) => !v)}
              />
              <View className="flex-row items-center justify-between">
                <RememberMe checked={remember} onToggle={() => setRemember((v) => !v)} />
                <Link href="/reset-password" asChild>
                  <Pressable>
                    <Text className="text-sm font-semibold text-fz-pink">Forgot Password ?</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

            <View className="gap-6">
              <AuthPrimaryButton
                label={login.isPending ? 'Logging in…' : 'Log In'}
                onPress={onSubmit}
                disabled={busy || !email || !password}
              />
              <View className="gap-4">
                <OrDivider />
                <AuthSocialButton
                  label={google.isPending ? 'Opening Google…' : 'Continue with Google'}
                  icon={<GoogleIcon />}
                  onPress={onGoogle}
                  disabled={busy}
                />
              </View>
            </View>
          </View>
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1.5">
          <Text className="text-sm text-fz-muted">Don’t have an account?</Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-fz-pink">Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
