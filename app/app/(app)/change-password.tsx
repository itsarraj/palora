import { useState } from 'react';
import { Alert, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Field, ScreenHeader } from '@/components/palora/forms';
import { PrimaryButton } from '@/components/palora/ui';
import { useChangePassword } from '@/hooks/useAuth';

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(app)/me'));

  const onSubmit = async () => {
    if (next.length < 8) return Alert.alert('Password', 'Use at least 8 characters.');
    if (next !== confirm) return Alert.alert('Password', 'Passwords don’t match.');
    try {
      await change.mutateAsync({ current_password: current, new_password: next });
      Alert.alert('Password updated');
      back();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Change password" onBack={back} />
      <KeyboardAwareScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text className="mb-6 text-sm text-fz-muted">Other devices stay signed in until their session expires.</Text>
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
        <Field label="New password" value={next} onChangeText={setNext} secureTextEntry hint="At least 8 characters" />
        <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <PrimaryButton label="Save" onPress={onSubmit} loading={change.isPending} />
      </KeyboardAwareScrollView>
    </View>
  );
}
