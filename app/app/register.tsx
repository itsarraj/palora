import { useState } from 'react';
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
} from '@/components/auth/AuthUi';
import { IconButton } from '@/components/palora/ui';
import { BackIcon, PaloraLogo } from '@/components/icons';
import { BirthdayField } from '@/components/palora/BirthdayPicker';
import { useGoogleLogin, useRegister } from '@/hooks/useAuth';


function toIsoBirthday(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const register = useRegister();
  const google = useGoogleLogin();
  const [name, setName] = useState('');

  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = register.isPending || google.isPending;

  const onSubmit = async () => {
    setError(null);
    const iso = toIsoBirthday(birthday);
    if (!iso) {
      setError('Birth date must be YYYY-MM-DD or DD/MM/YYYY');
      return;
    }
    try {
      await register.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        birthday: iso,
      });
      router.replace('/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Register failed');
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
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 16,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="gap-8">
          <View className="gap-8">
            <View className="flex-row items-center justify-between">
              <IconButton onPress={() => router.back()}>
                <BackIcon />
              </IconButton>
              <View className="flex-row items-center gap-1.5 pr-1">
                <PaloraLogo size={24} />
                <Text className="text-xl font-bold text-fz-plum">Palora</Text>
              </View>
            </View>
            <View className="gap-3">
              <Text className="text-3xl font-bold leading-10 text-fz-ink">Sign up</Text>
              <Text className="text-sm text-fz-muted">Create an account to continue!</Text>
            </View>
          </View>

          <View className="gap-6">
            <View className="gap-4">
              <AuthField
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
              />
              <AuthField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="yourname@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <BirthdayField
                variant="auth"
                label="Birth date"
                value={birthday}
                onChange={setBirthday}
                placeholder="Select your birth date"
              />
              <AuthField
                label="Set Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secure={!showPassword}
                onToggleSecure={() => setShowPassword((v) => !v)}
              />
            </View>

            {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

            <View className="gap-6">
              <AuthPrimaryButton
                label={register.isPending ? 'Registering…' : 'Register'}
                onPress={onSubmit}
                disabled={busy || !name || !email || !birthday || !password}
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
          <Text className="text-sm text-fz-muted">Already have an account?</Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-fz-pink">Login</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
