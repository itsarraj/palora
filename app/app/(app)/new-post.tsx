import { useState } from 'react';
import { Alert, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Field, ScreenHeader } from '@/components/palora/forms';
import { InterestChip, PrimaryButton, SegmentToggle } from '@/components/palora/ui';
import { useCreatePost } from '@/hooks/useDating';
import { INTERESTS } from '@/lib/fixtures';
import { getMode } from '@/lib/mode';

export default function NewPostScreen() {
  const insets = useSafeAreaInsets();
  const create = useCreatePost();
  const [segment, setSegment] = useState<'left' | 'right'>(getMode() === 'partner' ? 'right' : 'left');
  const [category, setCategory] = useState(INTERESTS[0]);
  const [question, setQuestion] = useState('');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(app)'));

  const submit = async () => {
    if (question.trim().length < 8) return Alert.alert('Ask something a little longer');
    try {
      await create.mutateAsync({ mode: segment === 'left' ? 'friends' : 'partner', category, question: question.trim() });
      back();
    } catch (e) {
      Alert.alert('Could not post', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Ask a question" onBack={back} />
      <KeyboardAwareScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-sm text-fz-muted">Posts appear on the home feed and are a low-pressure way for people to start talking to you.</Text>
        <SegmentToggle left="Friends" right="Dating" value={segment} onChange={setSegment} />
        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-fz-muted">Topic</Text>
        <View className="mb-4 flex-row flex-wrap">
          {INTERESTS.map((label) => (
            <InterestChip key={label} label={label} selected={category === label} onPress={() => setCategory(label)} small />
          ))}
        </View>
        <Field label="Your question" value={question} onChangeText={setQuestion} multiline maxLength={280} placeholder="If you could live anywhere in the world, where would you pick?" hint={`${question.length}/280`} />
        <PrimaryButton label="Post" onPress={submit} loading={create.isPending} />
      </KeyboardAwareScrollView>
    </View>
  );
}
