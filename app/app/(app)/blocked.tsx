import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/palora/forms';
import { Avatar, EmptyState, ErrorState, LoadingState } from '@/components/palora/ui';
import { useBlockedUsers, useUnblockUser } from '@/hooks/useDating';

export default function BlockedScreen() {
  const insets = useSafeAreaInsets();
  const blocked = useBlockedUsers();
  const unblock = useUnblockUser();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(app)/me'));

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Blocked" onBack={back} />
      {blocked.isLoading ? (
        <LoadingState />
      ) : blocked.isError ? (
        <ErrorState error={blocked.error} onRetry={() => blocked.refetch()} />
      ) : !blocked.data?.length ? (
        <EmptyState emoji="🛡️" title="No blocked users" body="People you block can’t see you or message you." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {blocked.data.map((p) => (
            <View key={p.id} className="rounded-3xl bg-white border border-fz-border/60 shadow-sm mb-3 flex-row items-center gap-3 px-5 py-4">
              <Avatar name={p.name} uri={p.photoUrl} size="md" />
              <Text className="flex-1 text-base font-semibold text-fz-ink">
                {p.name}, {p.age}
              </Text>
              <Pressable onPress={() => unblock.mutate(p.id)} className="rounded-[32px] border border-fz-plum/30 bg-fz-soft px-4 py-1.5 active:opacity-75">
                <Text className="text-xs font-semibold text-fz-plum">Unblock</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
