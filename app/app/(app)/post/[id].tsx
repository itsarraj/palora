import { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { ScreenHeader } from '@/components/palora/forms';
import { Avatar, EmptyState, FeedPostCard, LoadingState, timeAgo } from '@/components/palora/ui';
import { useAddComment, useComments, useToggleLike } from '@/hooks/useDating';
import { useKeyboard } from '@/hooks/useKeyboard';
import type { FeedPost } from '@/lib/fixtures';
import { colors } from '@/constants/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const comments = useComments(id);
  const add = useAddComment(id);
  const like = useToggleLike();
  const [text, setText] = useState('');
  const { isKeyboardVisible } = useKeyboard();

  // The post itself comes from whichever feed page is cached.
  const post = qc
    .getQueriesData<{ pages: FeedPost[][] }>({ queryKey: ['dating', 'feed'] })
    .flatMap(([, d]) => d?.pages.flat() ?? [])
    .find((p) => p.id === id);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(app)'));

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    add.mutate(body, { onError: (e) => Alert.alert('Not posted', e instanceof Error ? e.message : 'Try again') });
  };

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Post" onBack={back} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1 }}>

          <FlatList
            data={comments.data ?? []}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            ListHeaderComponent={
              post ? (
                <View className="mb-4">
                  <FeedPostCard post={post} onLike={() => like.mutate(post.id)} onPress={() => router.push(`/(app)/profile/${post.authorId}`)} />
                  <Text className="text-sm text-fz-muted">
                    {post.commentCount} {post.commentCount === 1 ? 'answer' : 'answers'}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={comments.isLoading ? <LoadingState /> : <EmptyState emoji="💭" title="No answers yet" body="Be the first to reply." />}
            renderItem={({ item }) => (
              <Pressable onPress={() => !item.mine && router.push(`/(app)/profile/${item.userId}`)} className="mb-3 flex-row gap-3">
                <Avatar name={item.name} size="md" />
                <View className="flex-1 rounded-2xl border border-fz-border/50 bg-white px-4 py-3 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-fz-plum">{item.mine ? 'You' : item.name}</Text>
                    <Text className="text-xs text-fz-muted">{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text className="mt-1 text-base text-fz-ink">{item.body}</Text>
                </View>
              </Pressable>
            )}
          />
          <View className="flex-row items-center gap-2 border-t border-fz-border bg-white px-4 py-3" style={{ paddingBottom: isKeyboardVisible ? 8 : insets.bottom + 8 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write an answer"
              placeholderTextColor="#9EA3AE"
              maxLength={500}
              className="h-11 flex-1 rounded-full bg-fz-soft px-4 text-fz-ink"
              onSubmitEditing={submit}
            />
            <Pressable onPress={submit} disabled={!text.trim() || add.isPending} className="h-11 items-center justify-center rounded-full px-4" style={{ backgroundColor: colors.plum, opacity: text.trim() ? 1 : 0.5 }}>
              <Text className="font-semibold text-white">Reply</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
