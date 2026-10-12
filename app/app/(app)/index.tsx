import { useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import { ActionSheet } from '@/components/palora/ActionSheet';
import { MatchModal } from '@/components/palora/MatchModal';
import { ReportSheet } from '@/components/palora/ReportSheet';
import { PaloraLogo } from '@/components/icons';
import {
  Avatar,
  EmptyState,
  ErrorState,
  FeedPostCard,
  OfflineBanner,
  SegmentToggle,
  StoryRail,
  refreshControl,
} from '@/components/palora/ui';
import { useBlockUser, useFeed, useProfile, useStories, useSwipe, useToggleLike } from '@/hooks/useDating';
import type { FeedPost, Person } from '@/lib/fixtures';
import { MODE_COPY, MODE_LABEL, useMode } from '@/lib/mode';
import { colors } from '@/constants/theme';

/**
 * Home: connect through what people say. The Friends | Dating switch here is the
 * app-wide mode; it also decides who shows up in the swipe deck.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useMode();
  const copy = MODE_COPY[mode];
  const stories = useStories();
  const feed = useFeed(mode);
  const me = useProfile();
  const like = useToggleLike();
  const swipe = useSwipe();
  const block = useBlockUser();
  const [menuFor, setMenuFor] = useState<FeedPost | null>(null);
  const [reportFor, setReportFor] = useState<FeedPost | null>(null);
  const [matched, setMatched] = useState<{ person: Person; conversationId?: string } | null>(null);
  const [pendingAuthor, setPendingAuthor] = useState<string | null>(null);

  const posts = feed.data?.pages.flat() ?? [];
  const isSelf = (p: FeedPost) => p.relation === 'self' || p.authorId === me.data?.user_id;

  const connect = (post: FeedPost) => {
    setPendingAuthor(post.authorId);
    swipe.mutate(
      { targetId: post.authorId, action: 'like', mode },
      {
        onSuccess: (res) => {
          if (res.matched && res.person) setMatched({ person: res.person, conversationId: res.conversation_id });
        },
        onSettled: () => setPendingAuthor(null),
      },
    );
  };

  const selfPhoto = me.data?.photos[0]?.url;
  const storyList = (stories.data ?? [{ id: 'self', name: me.data?.display_name ?? 'My Story', isSelf: true, photoUrl: selfPhoto }]).map((s) =>
    s.isSelf && !s.photoUrl ? { ...s, photoUrl: selfPhoto } : s
  );

  const header = (
    <View>
      <OfflineBanner />
      <View className="mt-2">
        <StoryRail
          stories={storyList}
          onAdd={() => router.push('/(app)/new-post')}
          onPress={(id) => router.push(`/(app)/profile/${id}`)}
        />
      </View>
      <View className="mt-6 px-4">
        <SegmentToggle
          left={MODE_LABEL.friends}
          right={MODE_LABEL.partner}
          value={mode === 'friends' ? 'left' : 'right'}
          onChange={(v) => setMode(v === 'left' ? 'friends' : 'partner')}
        />
      </View>
      <View className="mt-6 flex-row items-center justify-between px-4 pb-3">
        <Text className="text-xl font-bold text-fz-ink">{copy.feedHeading}</Text>
        <Pressable onPress={() => router.push('/(app)/new-post')} className="rounded-[32px] bg-fz-plum px-4 py-2 active:opacity-90">
          <Text className="text-sm font-semibold text-white">+ Ask</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <View className="flex-row items-center gap-2">
          <PaloraLogo size={28} />
          <Text className="fz-title">Palora</Text>
        </View>
        <Pressable onPress={() => router.push('/(app)/me')} hitSlop={8}>
          <Avatar name={me.data?.display_name ?? 'You'} uri={me.data?.photos[0]?.url} size="md" ring />
        </Pressable>
      </View>

      <FlashList
        data={posts}
        keyExtractor={(item) => item.id}
        extraData={pendingAuthor}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(feed.isRefetching && !feed.isFetchingNextPage, () => {
          feed.refetch();
          stories.refetch();
        })}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        ListEmptyComponent={
          feed.isLoading ? (
            <View className="py-16">
              <ActivityIndicator color={colors.plum} />
            </View>
          ) : feed.isError ? (
            <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
          ) : (
            <EmptyState
              emoji="💬"
              title="No posts yet"
              body="Be the first to ask something — posts help people start conversations with you."
              actionLabel="Ask a question"
              onAction={() => router.push('/(app)/new-post')}
            />
          )
        }
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.plum} style={{ marginVertical: 16 }} /> : null}
        renderItem={({ item }) => (
          <View className="px-4">
            <FeedPostCard
              post={item}
              onPress={() => router.push(`/(app)/post/${item.id}`)}
              onLike={() => like.mutate(item.id)}
              onComment={() => router.push(`/(app)/post/${item.id}`)}
              onMore={() => setMenuFor(item)}
              onAuthor={() => router.push(isSelf(item) ? '/(app)/me' : `/(app)/profile/${item.authorId}`)}
              connect={{
                label: copy.connect,
                sentLabel: copy.sent,
                pending: pendingAuthor === item.authorId,
                onConnect: () => connect(item),
                onMessage: () => (item.conversationId ? router.push(`/(app)/chat/${item.conversationId}`) : router.push('/(app)/messages')),
              }}
            />
          </View>
        )}
      />

      <MatchModal
        mode={mode}
        person={matched?.person ?? null}
        conversationId={matched?.conversationId}
        me={me.data ? { name: me.data.display_name, photoUrl: me.data.photos[0]?.url } : undefined}
        onClose={() => setMatched(null)}
      />

      <ActionSheet
        visible={Boolean(menuFor)}
        title={menuFor ? `${menuFor.author} · ${menuFor.city}` : undefined}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor && isSelf(menuFor)
            ? [{ label: 'View my profile', onPress: () => router.push('/(app)/me') }]
            : [
                { label: 'View profile', onPress: () => menuFor && router.push(`/(app)/profile/${menuFor.authorId}`) },
                { label: 'Report', destructive: true, onPress: () => setReportFor(menuFor) },
                { label: 'Block', destructive: true, onPress: () => menuFor && block.mutate(menuFor.authorId) },
              ]
        }
      />
      {reportFor ? <ReportSheet visible userId={reportFor.authorId} name={reportFor.author} onClose={() => setReportFor(null)} /> : null}
    </View>
  );
}
