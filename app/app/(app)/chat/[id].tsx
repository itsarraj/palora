import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { ActionSheet } from '@/components/palora/ActionSheet';

import { ReportSheet } from '@/components/palora/ReportSheet';
import { BackIcon } from '@/components/icons';
import { Avatar, ErrorState, IconButton, LoadingState } from '@/components/palora/ui';
import { useBlockUser, useConversationMessages, useConversations, useSendMessage, useUnmatch } from '@/hooks/useDating';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useKeyboard } from '@/hooks/useKeyboard';
import { colors } from '@/constants/theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const conversations = useConversations();
  const messages = useConversationMessages(id);
  const send = useSendMessage(id);
  const unmatch = useUnmatch();
  const block = useBlockUser();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);

  const convo = conversations.data?.find((c) => c.id === id);
  const { isPeerTyping, sendTyping } = useChatSocket(id, convo?.peerId);
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const items = useMemo(() => messages.data?.pages.flat() ?? [], [messages.data]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(app)/messages'));

  const onSend = () => {
    const body = text.trim();
    if (!body || !id) return;
    setText('');
    send.mutate(body, {
      onError: (e) => {
        setText(body);
        Alert.alert('Not sent', e instanceof Error ? e.message : 'Try again');
      },
    });
  };

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center gap-3 border-b border-fz-border bg-white px-4 py-3">
        <IconButton onPress={leave}>
          <BackIcon />
        </IconButton>
        <Pressable onPress={() => convo && router.push(`/(app)/profile/${convo.peerId}`)} className="flex-1 flex-row items-center gap-3">
          <Avatar name={convo?.name ?? 'Chat'} uri={convo?.photoUrl} size="md" />
          <View>
            <Text className="text-lg text-fz-ink">{convo?.name ?? 'Chat'}</Text>
            <Text className={`text-xs ${isPeerTyping ? 'font-medium text-fz-plum' : 'text-fz-muted'}`}>
              {isPeerTyping ? 'typing...' : 'Tap to view profile'}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenu(true)} hitSlop={8} className="px-2">
          <Text className="text-2xl text-fz-plum">⋯</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1 }}>
          {messages.isLoading ? (
            <LoadingState />
          ) : messages.isError ? (
            <ErrorState error={messages.error} onRetry={() => messages.refetch()} />
          ) : (
            <FlatList
              data={items}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (messages.hasNextPage && !messages.isFetchingNextPage) messages.fetchNextPage();
              }}
              ListFooterComponent={messages.isFetchingNextPage ? <ActivityIndicator color={colors.plum} /> : null}
              ListEmptyComponent={
                <View className="items-center py-10" style={{ transform: [{ scaleY: -1 }] }}>
                  <Text className="text-4xl">👋</Text>
                  <Text className="mt-2 text-center text-sm text-fz-muted">Say hi to {convo?.name ?? 'your match'}.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View className={`mb-3 max-w-[80%] rounded-2xl px-4 py-3 shadow-xs ${item.mine ? 'self-end bg-fz-plum' : 'self-start bg-white border border-fz-border/50'}`}>
                  <Text className={item.mine ? 'text-white' : 'text-fz-ink'}>{item.body}</Text>
                  <Text className={`mt-1 text-xs ${item.mine ? 'text-white/60' : 'text-fz-muted'}`}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            />
          )}

          <View
            className="flex-row items-center gap-2 border-t border-fz-border bg-white px-4 py-3"
            style={{ paddingBottom: isKeyboardVisible ? 8 : insets.bottom + 8 }}>
            <TextInput
              value={text}
              onChangeText={(val) => {
                setText(val);
                if (val.trim()) sendTyping();
              }}
              placeholder="Type a message"
              placeholderTextColor="#9EA3AE"
              multiline
              maxLength={2000}
              className="max-h-28 min-h-11 flex-1 rounded-2xl bg-fz-soft px-4 py-2.5 text-fz-ink"
              onSubmitEditing={onSend}
            />
            <Pressable
              onPress={onSend}
              disabled={!text.trim() || send.isPending}
              className="h-11 items-center justify-center rounded-[32px] px-5"
              style={{ backgroundColor: colors.plum, opacity: !text.trim() ? 0.5 : 1 }}>
              <Text className="font-semibold text-white">Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={menu}
        title={convo?.name}
        onClose={() => setMenu(false)}
        actions={[
          { label: 'View profile', onPress: () => convo && router.push(`/(app)/profile/${convo.peerId}`) },
          {
            label: 'Unmatch',
            destructive: true,
            onPress: () =>
              convo &&
              Alert.alert(`Unmatch ${convo.name}?`, 'This deletes the conversation for both of you.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Unmatch', style: 'destructive', onPress: () => unmatch.mutate(convo.matchId, { onSuccess: leave }) },
              ]),
          },
          { label: 'Report', destructive: true, onPress: () => setReport(true) },
          {
            label: 'Block',
            destructive: true,
            onPress: () => convo && block.mutate(convo.peerId, { onSuccess: leave }),
          },
        ]}
      />
      {convo ? <ReportSheet visible={report} userId={convo.peerId} name={convo.name} onClose={() => setReport(false)} onDone={leave} /> : null}
    </View>
  );
}
