import { Image, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ScreenHeader } from '@/components/palora/forms';
import { ChevronRightIcon, SettingsIcon } from '@/components/icons';
import { Avatar, ErrorState, IconButton, LoadingState, PrimaryButton } from '@/components/palora/ui';
import { useLogout } from '@/hooks/useAuth';
import { useFeed, useProfile } from '@/hooks/useDating';
import { INTENTS } from '@/lib/fixtures';

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const me = useProfile();
  const feed = useFeed();
  const logout = useLogout();
  const qc = useQueryClient();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(app)'));

  const signOut = async () => {
    await logout.mutateAsync();
    qc.clear();
    router.replace('/welcome');
  };

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  const p = me.data;
  const intentLabel = INTENTS.find((i) => i.id === p.intent)?.label ?? p.intent;
  const myPosts = (feed.data?.pages.flat() ?? []).filter((post) => post.authorId === p.user_id || post.relation === 'self');

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader
        title="Profile"
        onBack={back}
        right={
          <IconButton onPress={() => router.push('/(app)/settings')}>
            <SettingsIcon size={22} />
          </IconButton>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="mt-6 items-center px-6">
          <Avatar name={p.display_name} uri={p.photos[0]?.url} size="hero" ring />
          <Text className="mt-4 text-2xl font-bold text-fz-ink">
            {p.display_name}
            {p.age ? `, ${p.age}` : ''}
          </Text>
          <Text className="mt-1 text-xs uppercase tracking-wider text-fz-muted">{[p.city, p.country].filter(Boolean).join(', ') || 'Location not set'}</Text>
          <View className="mt-3 rounded-[32px] bg-fz-soft px-3.5 py-1.5">
            <Text className="text-xs font-semibold text-fz-plum">{intentLabel}</Text>
          </View>
          {p.about ? <Text className="mt-3 text-center text-base text-fz-ink leading-relaxed">{p.about}</Text> : null}

          {/* Interests Display */}
          {p.interests && p.interests.length > 0 ? (
            <View className="mt-3.5 flex-row flex-wrap justify-center gap-2">
              {p.interests.map((interest) => (
                <View key={interest} className="rounded-[32px] bg-white border border-[#4B164C]/20 px-3.5 py-1.5 shadow-sm">
                  <Text className="text-xs font-medium text-fz-plum">{interest}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Photos Strip Preview */}
          {p.photos && p.photos.length > 1 ? (
            <View className="mt-4 flex-row gap-2">
              {p.photos.map((ph, idx) => (
                <Image
                  key={ph.id || idx}
                  source={{ uri: ph.url }}
                  className="h-16 w-16 rounded-2xl bg-fz-soft border border-white"
                  resizeMode="cover"
                />
              ))}
            </View>
          ) : null}

          <View className="mt-5 w-full flex-row gap-2.5">
            <PrimaryButton label="Edit profile" onPress={() => router.push('/(app)/edit-profile')} className="flex-1" />
            <Pressable
              onPress={() => router.push('/(app)/new-post')}
              className="h-12 items-center justify-center rounded-[32px] border border-fz-plum bg-white px-5 active:bg-fz-soft/40">
              <Text className="text-sm font-semibold text-fz-plum">+ Ask</Text>
            </Pressable>
          </View>
        </View>

        {/* My Catalog Questions */}
        <Section title="My Catalog Questions">
          {myPosts.length > 0 ? (
            myPosts.map((post) => (
              <Pressable
                key={post.id}
                onPress={() => router.push(`/(app)/post/${post.id}`)}
                className="border-b border-fz-border/60 p-5 active:bg-fz-soft/30">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-fz-plum">{post.category}</Text>
                  <Text className="text-xs text-fz-muted">{post.mode === 'friends' ? 'Friends' : 'Dating'}</Text>
                </View>
                <Text className="mt-1 text-base font-semibold text-fz-ink" numberOfLines={2}>
                  {post.question}
                </Text>
                <View className="mt-2 flex-row items-center gap-4">
                  <Text className="text-xs text-fz-muted">{post.likeCount} likes</Text>
                  <Text className="text-xs text-fz-muted">{post.commentCount} replies</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View className="p-6 items-center">
              <Text className="text-sm text-fz-muted text-center">You haven’t posted any questions yet.</Text>
              <Pressable onPress={() => router.push('/(app)/new-post')} className="mt-3 rounded-[32px] bg-fz-soft px-4 py-2 active:opacity-90">
                <Text className="text-xs font-semibold text-fz-plum">+ Post to Catalog</Text>
              </Pressable>
            </View>
          )}
        </Section>

        <Section title="Discovery">
          <Row label="Preferences" value={`${p.min_age}–${p.max_age} · ${p.max_distance_km} km`} onPress={() => router.push('/(app)/preferences')} />
          <Row label="Blocked users" onPress={() => router.push('/(app)/blocked')} />
        </Section>

        <Section title="Account">
          <Row label="Settings" hint="Password, email, legal, delete account" onPress={() => router.push('/(app)/settings')} />
          {p.has_password ? <Row label="Change password" onPress={() => router.push('/(app)/change-password')} /> : null}
          <Row label="Sign out" onPress={signOut} />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-8 px-4">
      <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-fz-muted">{title}</Text>
      <View className="rounded-3xl bg-white border border-fz-border/60 shadow-sm overflow-hidden">{children}</View>
    </View>
  );
}

function Row({ label, hint, value, onPress }: { label: string; hint?: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center justify-between border-b border-fz-border/60 px-5 py-4 active:bg-fz-soft/30">
      <View className="flex-1 pr-3">
        <Text className={`text-base ${onPress ? 'text-fz-ink font-medium' : 'text-fz-muted'}`}>{label}</Text>
        {hint ? <Text className="mt-0.5 text-xs text-fz-muted">{hint}</Text> : null}
      </View>
      <View className="flex-row items-center gap-2">
        {value ? (
          <Text className="max-w-[180px] text-sm text-fz-muted" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {onPress ? <ChevronRightIcon size={18} color="#9EA3AE" /> : null}
      </View>
    </Pressable>
  );
}
