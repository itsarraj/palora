import { useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { PrimaryButton } from '@/components/palora/ui';

import { useBlockUser, useReportUser } from '@/hooks/useDating';
import { REPORT_REASONS } from '@/lib/fixtures';

/** Report dialog: pick a reason, optional details, optionally block afterwards. */
export function ReportSheet({
  visible,
  userId,
  name,
  onClose,
  onDone,
}: {
  visible: boolean;
  userId: string;
  name: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const report = useReportUser();
  const block = useBlockUser();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);

  const submit = async () => {
    if (!reason) return;
    try {
      await report.mutateAsync({ userId, reason, details: details.trim() || undefined });
      if (alsoBlock) await block.mutateAsync(userId);
      onClose();
      Alert.alert('Thanks for letting us know', `We’ve received your report about ${name}.`);
      onDone?.();
    } catch (e) {
      Alert.alert('Could not send report', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView behavior="padding">
          <Pressable onPress={() => undefined} className="fz-sheet px-4 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="fz-handle" />
            <Text className="text-xl text-fz-plum">Report {name}</Text>
            <Text className="mt-1 text-sm text-fz-muted">Your report is anonymous.</Text>
            <View className="mt-4">
              {REPORT_REASONS.map((r) => (
                <Pressable key={r} onPress={() => setReason(r)} className="flex-row items-center gap-3 py-2.5">
                  <View
                    className="h-5 w-5 items-center justify-center rounded-full border-2"
                    style={{ borderColor: reason === r ? '#DD88CF' : '#C9CDD4' }}>
                    {reason === r ? <View className="h-2.5 w-2.5 rounded-full bg-fz-pink" /> : null}
                  </View>
                  <Text className="text-base text-fz-ink">{r}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Anything else we should know? (optional)"
              placeholderTextColor="#9EA3AE"
              multiline
              className="fz-input-area mt-2"
            />
            <Pressable onPress={() => setAlsoBlock((v) => !v)} className="mt-3 flex-row items-center gap-3">
              <View
                className="h-5 w-5 items-center justify-center rounded-md border-2"
                style={{ borderColor: alsoBlock ? '#4B164C' : '#C9CDD4', backgroundColor: alsoBlock ? '#4B164C' : 'transparent' }}>
                {alsoBlock ? <Text className="text-xs font-bold text-white">✓</Text> : null}
              </View>
              <Text className="text-sm text-fz-ink">Also block {name}</Text>
            </Pressable>
            <PrimaryButton
              label="Send report"
              onPress={submit}
              disabled={!reason}
              loading={report.isPending || block.isPending}
              variant="danger"
              className="mt-5"
            />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
