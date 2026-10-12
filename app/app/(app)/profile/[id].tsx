import { useCallback, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionSheet } from '@/components/palora/ActionSheet';
import { MatchModal } from '@/components/palora/MatchModal';
import { ReportSheet } from '@/components/palora/ReportSheet';
import { SwipeCard } from '@/components/palora/SwipeCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/palora/ui';
import { useBlockUser, usePerson, useProfile, useSwipe } from '@/hooks/useDating';
import type { Person } from '@/lib/fixtures';
import { useMode } from '@/lib/mode';
import type { SwipeAction } from '@/services/datingApi';

/** Full-screen profile opened from the feed, stories or a match avatar. Swipe or tap to decide. */
export default function ProfileSwipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = usePerson(id);
  const me = useProfile();
  const swipe = useSwipe();
  const [mode] = useMode();
  const block = useBlockUser();
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [matched, setMatched] = useState<{ person: Person; conversationId?: string } | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/create');
  }, []);

  const onSwipe = useCallback(
    (action: SwipeAction, p: Person) => {
      swipe.mutate(
        { targetId: p.id, action, mode },
        {
          onSuccess: (res) => {
            if (res.matched) setMatched({ person: res.person ?? p, conversationId: res.conversation_id });
            else goBack();
          },
          onError: goBack,
        },
      );
    },
    [goBack, swipe, mode],
  );

  if (person.isLoading) return <LoadingState />;
  if (person.isError) return <ErrorState error={person.error} onRetry={() => person.refetch()} />;
  const p = person.data;
  if (!p) return <EmptyState title="Profile not found" actionLabel="Go back" onAction={goBack} />;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      <SwipeCard person={p} mode={mode} onSwipe={onSwipe} onBack={goBack} onMore={() => setMenu(true)} />

      <MatchModal
        mode={mode}
        person={matched?.person ?? null}
        conversationId={matched?.conversationId}
        me={me.data ? { name: me.data.display_name, photoUrl: me.data.photos[0]?.url } : undefined}
        onClose={() => {
          setMatched(null);
          goBack();
        }}
      />
      <ActionSheet
        visible={menu}
        title={p.name}
        onClose={() => setMenu(false)}
        actions={[
          { label: 'Report', destructive: true, onPress: () => setReport(true) },
          {
            label: 'Block',
            destructive: true,
            onPress: () => {
              block.mutate(p.id);
              goBack();
            },
          },
        ]}
      />
      <ReportSheet visible={report} userId={p.id} name={p.name} onClose={() => setReport(false)} onDone={goBack} />
    </View>
  );
}
