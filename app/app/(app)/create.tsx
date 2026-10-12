import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ActionSheet } from '@/components/palora/ActionSheet';
import { MatchModal } from '@/components/palora/MatchModal';
import { ReportSheet } from '@/components/palora/ReportSheet';
import { SwipeCard } from '@/components/palora/SwipeCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/palora/ui';
import { useBlockUser, useDeck, useProfile, useSwipe } from '@/hooks/useDating';
import type { Person } from '@/lib/fixtures';
import { MODE_LABEL, toggleMode, useMode } from '@/lib/mode';
import type { SwipeAction } from '@/services/datingApi';

/** Centre tab: swipe deck for the current mode. Left = pass, right = like, star = superlike. */
export default function MatchSwipeScreen() {
  const [mode] = useMode();
  const deck = useDeck(mode);
  const me = useProfile();
  const swipe = useSwipe();
  const block = useBlockUser();
  const [queue, setQueue] = useState<Person[]>([]);

  // When mode or preferences change (looking_for, city, age range, distance), reset queue and refetch
  const lookingForStr = me.data?.looking_for?.slice().sort().join(',') ?? '';
  const prefKey = `${mode}-${lookingForStr}-${me.data?.city ?? ''}-${me.data?.min_age ?? ''}-${me.data?.max_age ?? ''}-${me.data?.max_distance_km ?? ''}`;
  const lastPrefKey = useRef(prefKey);

  useEffect(() => {
    if (lastPrefKey.current !== prefKey) {
      lastPrefKey.current = prefKey;
      setQueue([]);
      deck.refetch();
    }
  }, [prefKey, deck]);
  const [matched, setMatched] = useState<{ person: Person; conversationId?: string } | null>(null);
  const [menuFor, setMenuFor] = useState<Person | null>(null);
  const [reportFor, setReportFor] = useState<Person | null>(null);

  // Sync fresh deck data into queue
  useEffect(() => {
    if (!deck.data) return;
    setQueue((old) => {
      if (old.length === 0) return deck.data;
      const seen = new Set(old.map((p) => p.id));
      const incoming = deck.data.filter((p) => !seen.has(p.id));
      return [...old, ...incoming];
    });
  }, [deck.data]);

  const person = queue[0];

  const onSwipe = useCallback(
    (action: SwipeAction, p: Person) => {
      setQueue((q) => q.filter((x) => x.id !== p.id));
      swipe.mutate(
        { targetId: p.id, action, mode },
        {
          onSuccess: (res) => {
            if (res.matched) setMatched({ person: res.person ?? p, conversationId: res.conversation_id });
          },
        },
      );
    },
    [swipe, mode],
  );

  useEffect(() => {
    if (queue.length <= 3 && !deck.isFetching && deck.data && deck.data.length >= 30) deck.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  if ((deck.isLoading || deck.isFetching) && queue.length === 0) return <LoadingState label="Finding people near you…" />;

  if (deck.isError && queue.length === 0) {
    return (
      <View className="flex-1 bg-fz-canvas">
        <ErrorState error={deck.error} onRetry={() => deck.refetch()} />
      </View>
    );
  }

  if (!person) {
    return (
      <View className="flex-1 bg-fz-canvas">
        <StatusBar barStyle="dark-content" />
        <EmptyState
          emoji="💜"
          title="You’re all caught up"
          body={`No more people open to ${MODE_LABEL[mode].toLowerCase()} near you right now. Try the other mode, widen your distance or age range, or check back later.`}
          actionLabel={`Switch to ${MODE_LABEL[mode === 'friends' ? 'partner' : 'friends']}`}
          onAction={toggleMode}
        />
        <Pressable onPress={() => router.push('/(app)/preferences')} className="items-center pb-6">
          <Text className="text-base text-fz-pink">Adjust preferences</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      <SwipeCard
        key={person.id}
        person={person}
        mode={mode}
        onModePress={toggleMode}
        onSwipe={onSwipe}
        onMore={() => setMenuFor(person)}
        respectSafeArea={false}
        bottomInset={12}
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
        title={menuFor?.name}
        onClose={() => setMenuFor(null)}
        actions={[
          { label: 'Report', destructive: true, onPress: () => setReportFor(menuFor) },
          {
            label: 'Block',
            destructive: true,
            onPress: () => {
              if (!menuFor) return;
              setQueue((q) => q.filter((x) => x.id !== menuFor.id));
              block.mutate(menuFor.id);
            },
          },
        ]}
      />
      {reportFor ? (
        <ReportSheet
          visible
          userId={reportFor.id}
          name={reportFor.name}
          onClose={() => setReportFor(null)}
          onDone={() => setQueue((q) => q.filter((x) => x.id !== reportFor.id))}
        />
      ) : null}
    </View>
  );
}
