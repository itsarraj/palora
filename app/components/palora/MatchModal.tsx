import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar, PrimaryButton } from '@/components/palora/ui';
import type { Person } from '@/lib/fixtures';
import { MODE_COPY, type Mode } from '@/lib/mode';

export function MatchModal({
  person,
  conversationId,
  me,
  mode = 'partner',
  onClose,
}: {
  person: Person | null;
  conversationId?: string;
  me?: { name: string; photoUrl?: string };
  mode?: Mode;
  onClose: () => void;
}) {
  const copy = MODE_COPY[mode];
  return (
    <Modal visible={Boolean(person)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-fz-plum/95 px-8">
        <Text className="text-5xl">{mode === 'friends' ? '🎉' : '💜'}</Text>
        <Text className="mt-4 text-center text-3xl font-bold text-white">{copy.matchTitle}</Text>
        <Text className="mt-2 text-center text-base text-white/80">{copy.matchBody(person?.name ?? '')}</Text>
        <View className="mt-8 flex-row items-center">
          <View style={{ marginRight: -16 }}>
            <Avatar name={me?.name ?? 'You'} uri={me?.photoUrl} size="hero" ring />
          </View>
          <Avatar name={person?.name ?? ''} uri={person?.photoUrl} size="hero" ring />
        </View>
        <View className="mt-10 w-full gap-3">
          <PrimaryButton
            label="Say hello"
            variant="pink"
            onPress={() => {
              onClose();
              if (conversationId) router.push(`/(app)/chat/${conversationId}`);
              else router.push('/(app)/messages');
            }}
          />
          <Pressable onPress={onClose} className="h-14 items-center justify-center rounded-[32px] border border-white/40 active:opacity-80">
            <Text className="text-base font-semibold text-white">{copy.keepGoing}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
