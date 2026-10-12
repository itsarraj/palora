import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ChevronRightIcon, PaloraLogo } from '@/components/icons';
import { ScreenHeader } from '@/components/palora/forms';
import { ErrorState, LoadingState } from '@/components/palora/ui';
import { useLogout, usePasswordReset } from '@/hooks/useAuth';
import { useDeleteAccount, useProfile } from '@/hooks/useDating';
import { clearTokens } from '@/lib/auth-storage';
import { queryKeys } from '@/lib/queryClient';
import { BFF_API_URL } from '@/constants/config';

/** Phone sign-ups get a synthetic address; no real inbox behind it. */
const isSyntheticEmail = (email: string) =>
  email.endsWith('@palora.local') || email.endsWith('@friendzy.local');

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const me = useProfile();
  const logout = useLogout();
  const reset = usePasswordReset();
  const del = useDeleteAccount();
  const qc = useQueryClient();
  const [resetSent, setResetSent] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(app)/me'));

  const signOut = async () => {
    await logout.mutateAsync();
    qc.clear();
    router.replace('/welcome');
  };

  const sendReset = (email: string, purpose: 'reset' | 'set') => {
    const title = purpose === 'set' ? 'Set a password' : 'Reset password';
    Alert.alert(title, `We’ll email a reset link to ${email}. Open it (or paste the code) to choose a new password.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send link',
        onPress: async () => {
          try {
            await reset.mutateAsync(email);
            setResetSent(true);
            Alert.alert('Check your inbox', 'If the link opens in a browser, copy the code from it and tap “I have a reset code”.', [
              { text: 'Later' },
              { text: 'I have a reset code', onPress: () => router.push({ pathname: '/reset-password', params: { email } }) },
            ]);
          } catch (e) {
            Alert.alert('Could not send', e instanceof Error ? e.message : 'Try again');
          }
        },
      },
    ]);
  };

  const deleteAccount = () =>
    Alert.alert('Delete account?', 'Your profile, photos, matches and messages are removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync();
            await clearTokens();
            qc.clear();
            qc.setQueryData(queryKeys.session, { hasToken: false });
            router.replace('/welcome');
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again');
          }
        },
      },
    ]);

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  const p = me.data;
  const realEmail = !isSyntheticEmail(p.email);

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Settings" onBack={back} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Section title="Account">
          <Row label="Email" value={realEmail ? p.email : 'Not set'} />
          {p.phone ? <Row label="Phone" value={p.phone} /> : null}
          <Row label="Edit profile" onPress={() => router.push('/(app)/edit-profile')} />
        </Section>

        <Section title="Password">
          {p.has_password ? (
            <Row label="Change password" hint="Use your current password" onPress={() => router.push('/(app)/change-password')} />
          ) : null}
          {realEmail ? (
            <Row
              label={p.has_password ? 'Reset password' : 'Set a password'}
              hint={
                p.has_password
                  ? 'Forgot it? We’ll email you a reset link'
                  : 'You signed in with Google. Add a password to also log in with email'
              }
              value={resetSent ? 'Link sent' : undefined}
              onPress={() => sendReset(p.email, p.has_password ? 'reset' : 'set')}
            />
          ) : (
            <Row label="Set a password" hint="This account has no email, so a reset link can’t be sent" />
          )}
          <Row label="I have a reset code" hint="Paste the code from the email" onPress={() => router.push({ pathname: '/reset-password', params: realEmail ? { email: p.email } : {} })} />
        </Section>

        <Section title="Discovery">
          <Row label="Preferences" value={`${p.min_age}–${p.max_age} · ${p.max_distance_km} km`} onPress={() => router.push('/(app)/preferences')} />
          <Row label="Blocked users" onPress={() => router.push('/(app)/blocked')} />
        </Section>

        <Section title="Legal">
          <Row label="Privacy policy" onPress={() => Linking.openURL(`${BFF_API_URL}/api/v1/legal/privacy`)} />
          <Row label="Terms of service" onPress={() => Linking.openURL(`${BFF_API_URL}/api/v1/legal/terms`)} />
        </Section>

        <Section title="Session">
          <Row label="Sign out" onPress={signOut} />
          <Row label="Delete account" destructive onPress={deleteAccount} />
        </Section>

        <View className="my-8 items-center justify-center gap-2 opacity-80">
          <PaloraLogo size={28} />
          <Text className="text-xs font-semibold text-fz-muted">Palora v0.2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6 px-4">
      <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-fz-muted">{title}</Text>
      <View className="rounded-3xl bg-white border border-fz-border/60 shadow-sm overflow-hidden">{children}</View>
    </View>
  );
}

function Row({
  label,
  hint,
  value,
  onPress,
  destructive,
}: {
  label: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center justify-between border-b border-fz-border/60 px-5 py-4 active:bg-fz-soft/30">
      <View className="flex-1 pr-3">
        <Text className={`text-base ${destructive ? 'text-fz-danger font-medium' : onPress ? 'text-fz-ink font-medium' : 'text-fz-muted'}`}>{label}</Text>
        {hint ? <Text className="mt-0.5 text-xs text-fz-muted">{hint}</Text> : null}
      </View>
      <View className="flex-row items-center gap-2">
        {value ? (
          <Text className="max-w-[160px] text-sm text-fz-muted" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {onPress ? <ChevronRightIcon size={18} color="#9EA3AE" /> : null}
      </View>
    </Pressable>
  );
}
