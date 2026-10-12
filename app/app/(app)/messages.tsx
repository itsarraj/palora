import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Svg, { Path } from 'react-native-svg';

import { ActionSheet } from '@/components/palora/ActionSheet';
import { ReportSheet } from '@/components/palora/ReportSheet';
import { MatchHeartIcon, MessagesWatermark } from '@/components/icons';
import { EmptyState, ErrorState, LoadingState, MessageRow, OfflineBanner, refreshControl } from '@/components/palora/ui';
import { useBlockUser, useConversations, useMatches, useUnmatch } from '@/hooks/useDating';
import type { MatchItem } from '@/lib/fixtures';
import { initials, placeholderColor } from '@/constants/theme';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const conversations = useConversations();
  const matches = useMatches();
  const unmatch = useUnmatch();
  const block = useBlockUser();
  const [menuFor, setMenuFor] = useState<MatchItem | null>(null);
  const [reportFor, setReportFor] = useState<MatchItem | null>(null);

  const rows = conversations.data ?? [];
  const list = matches.data ?? [];

  const confirmUnmatch = (m: MatchItem) =>
    Alert.alert(`Unmatch ${m.person.name}?`, 'This removes the match and your conversation for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unmatch', style: 'destructive', onPress: () => unmatch.mutate(m.id) },
    ]);

  let canGoBack = false;
  try {
    canGoBack = router.canGoBack();
  } catch {
    canGoBack = false;
  }

  return (
    <View className="flex-1 bg-fz-plum" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" />
      <OfflineBanner />

      {/* Decorative Watermark */}
      <View className="pointer-events-none absolute right-[-20px] top-0">
        <MessagesWatermark size={180} opacity={0.2} />
      </View>

      {/* Top Header */}
      <View className="relative h-14 flex-row items-center justify-center px-6">
        {canGoBack ? (
          <Pressable
            onPress={() => router.back()}
            className="absolute left-6 h-10 w-10 items-center justify-center rounded-full border border-white/20"
            hitSlop={8}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18L9 12L15 6" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        ) : null}
        <Text className="text-2xl font-bold text-white text-center">Messages</Text>
      </View>

      {/* Recent Matches Section */}
      <View className="mt-2 pb-5">
        <Text className="px-6 text-base font-semibold text-white">Recent Matches</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3.5"
          contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
          {/* Likes / Counter Card */}
          <Pressable
            onPress={() => router.push('/(app)/create')}
            className="h-[92px] w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/20">
            <MatchHeartIcon size={32} color="#FFFFFF" />
            <Text className="mt-1 text-base font-bold text-white">
              {list.length}
            </Text>
          </Pressable>

          {/* Match Cards */}
          {list.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/(app)/chat/${m.conversationId}`)}
              onLongPress={() => setMenuFor(m)}
              className="relative h-[92px] w-20 overflow-hidden rounded-2xl bg-white/10">
              {m.person.photoUrl ? (
                <Image source={{ uri: m.person.photoUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View
                  className="h-full w-full items-center justify-center"
                  style={{ backgroundColor: placeholderColor(m.person.name) }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>{initials(m.person.name)}</Text>
                </View>
              )}
              <View className="absolute inset-x-0 bottom-0 items-center bg-black/40 py-1">
                <Text className="text-[11px] font-semibold text-white text-center" numberOfLines={1}>
                  {m.person.name.split(' ')[0]}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* White Sheet for Messages */}
      <View className="fz-message-sheet">
        <FlashList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl(conversations.isRefetching, () => {
            conversations.refetch();
            matches.refetch();
          })}
          renderItem={({ item }) => <MessageRow item={item} onPress={() => router.push(`/(app)/chat/${item.id}`)} />}
          ItemSeparatorComponent={() => <View className="h-px bg-fz-ink/[0.08]" />}
          ListEmptyComponent={
            conversations.isLoading || matches.isLoading ? (
              <LoadingState />
            ) : conversations.isError ? (
              <ErrorState error={conversations.error} onRetry={() => conversations.refetch()} />
            ) : list.length > 0 ? (
              <EmptyState emoji="👋" title="Say hi" body="Tap a match above to start the conversation." />
            ) : (
              <EmptyState
                emoji="✨"
                title="No matches yet"
                body="When you and someone else like each other, they show up here."
                actionLabel="Start swiping"
                onAction={() => router.replace('/(app)/create')}
              />
            )
          }
        />
      </View>

      <ActionSheet
        visible={Boolean(menuFor)}
        title={menuFor?.person.name}
        onClose={() => setMenuFor(null)}
        actions={[
          { label: 'Open chat', onPress: () => menuFor && router.push(`/(app)/chat/${menuFor.conversationId}`) },
          { label: 'View profile', onPress: () => menuFor && router.push(`/(app)/profile/${menuFor.person.id}`) },
          { label: 'Unmatch', destructive: true, onPress: () => menuFor && confirmUnmatch(menuFor) },
          { label: 'Report', destructive: true, onPress: () => setReportFor(menuFor) },
          { label: 'Block', destructive: true, onPress: () => menuFor && block.mutate(menuFor.person.id) },
        ]}
      />
      {reportFor ? <ReportSheet visible userId={reportFor.person.id} name={reportFor.person.name} onClose={() => setReportFor(null)} /> : null}
    </View>
  );
}
