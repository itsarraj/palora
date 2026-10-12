import { useEffect, useState } from 'react';
import { Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { AuthPrimaryButton } from '@/components/auth/AuthUi';
import { BackIcon } from '@/components/icons';
import { IconButton } from '@/components/palora/ui';
import { colors } from '@/constants/theme';
import { usePasswordReset, useSession } from '@/hooks/useAuth';
import { authApi } from '@/services/authApi';

/**
 * Two modes on one route:
 *   /reset-password                 request a link (email form)
 *   /reset-password?token=…         choose a new password (deep link from the email,
 *                                   or the user pastes the code from the link)
 * Also reachable while signed in from Settings → Reset password.
 */
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const session = useSession();
  const reset = usePasswordReset();
  const [email, setEmail] = useState(params.email ?? '');

  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [mode, setMode] = useState<'request' | 'confirm'>(params.token || params.email ? 'confirm' : 'request');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.token) {
      setToken(params.token);
      setMode('confirm');
    }
  }, [params.token]);

  const confirm = useMutation({
    mutationFn: () => authApi.passwordResetConfirm(extractToken(token), password),
  });

  const onRequest = async () => {
    setError(null);
    setMsg(null);
    try {
      await reset.mutateAsync(email.trim());
      setMsg('If that email exists, a reset link was sent. Open it, or paste the code below.');
      setMode('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  const onConfirm = async () => {
    setError(null);
    setMsg(null);
    if (!extractToken(token)) return setError('Paste the reset code from the email');
    if (password.length < 8) return setError('Use at least 8 characters');
    if (password !== confirmPw) return setError('Passwords don’t match');
    try {
      await confirm.mutateAsync();
      setMsg('Password updated. You can log in with it now.');
      setTimeout(() => {
        if (session.data?.hasToken) router.replace('/(app)/settings');
        else router.replace('/login');
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed — the link may have expired');
    }
  };

  const busy = reset.isPending || confirm.isPending;

  return (
    <View className="flex-1 bg-auth-bg" style={{ paddingTop: insets.top + 16 }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <IconButton
          className="mb-6"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(session.data?.hasToken ? '/(app)/settings' : '/login'))}>
          <BackIcon size={20} color={colors.ink} />
        </IconButton>

        {mode === 'request' ? (
          <>
            <Text className="text-3xl font-bold text-auth-ink">Forgot password?</Text>
            <Text className="mt-3 text-xs font-medium text-auth-muted">Enter your email and we’ll send a reset link</Text>
            <Label>Email</Label>
            <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="yourname@gmail.com" />
            <Feedback error={error} msg={msg} />
            <View className="mt-8">
              <AuthPrimaryButton label={busy ? 'Sending…' : 'Send link'} onPress={onRequest} disabled={!email.trim() || busy} />
            </View>
            <Pressable onPress={() => setMode('confirm')} className="mt-5 items-center">
              <Text className="text-sm font-semibold text-auth-link">I already have a reset code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-3xl font-bold text-auth-ink">New password</Text>
            <Text className="mt-3 text-xs font-medium text-auth-muted">
              {email ? `A reset link was sent to ${email}. ` : ''}
              Paste the code from the email (or the whole link) and choose a new password.
            </Text>
            <Label>Reset code</Label>
            <Input autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken} placeholder="Paste code or link" />
            <Label>New password</Label>
            <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 8 characters" />
            <Label>Confirm new password</Label>
            <Input secureTextEntry value={confirmPw} onChangeText={setConfirmPw} placeholder="Repeat it" />
            <Feedback error={error} msg={msg} />
            <View className="mt-8">
              <AuthPrimaryButton label={busy ? 'Saving…' : 'Set new password'} onPress={onConfirm} disabled={busy} />
            </View>
            <Pressable
              onPress={() => {
                setMode('request');
                setError(null);
                setMsg(null);
              }}
              className="mt-5 items-center">
              <Text className="text-sm font-semibold text-auth-link">{email ? 'Send another link' : 'Send me a link instead'}</Text>
            </Pressable>
          </>
        )}

        {!session.data?.hasToken ? (
          <Link href="/login" asChild>
            <Pressable className="mt-4 items-center">
              <Text className="text-sm text-auth-muted">Back to login</Text>
            </Pressable>
          </Link>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

/** Accepts the raw token or the full emailed link (…/reset-password?token=XYZ). */
function extractToken(raw: string): string {
  const s = raw.trim();
  const m = s.match(/[?&]token=([^&#\s]+)/);
  return (m ? decodeURIComponent(m[1]) : s).trim();
}

function Label({ children }: { children: string }) {
  return <Text className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wider text-auth-muted">{children}</Text>;
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View className="h-14 justify-center rounded-2xl border border-auth-border bg-white px-4">
      <TextInput placeholderTextColor="#9EA3AE" {...props} className="text-base text-auth-ink" />
    </View>
  );
}

function Feedback({ error, msg }: { error: string | null; msg: string | null }) {
  if (error) return <Text className="mt-4 text-sm text-red-500">{error}</Text>;
  if (msg) return <Text className="mt-4 text-sm text-auth-muted">{msg}</Text>;
  return null;
}
