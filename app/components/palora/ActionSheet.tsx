import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SheetAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

/** Bottom action sheet used for block / report / unmatch menus. */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <Pressable
          onPress={() => undefined}
          className="fz-sheet px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="fz-handle" />
          {title ? <Text className="mb-2 px-2 text-center text-sm text-fz-muted">{title}</Text> : null}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              className="h-14 items-center justify-center border-b border-fz-border">
              <Text className={`text-base ${a.destructive ? 'text-fz-danger' : 'text-fz-plum'}`}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} className="fz-btn-soft mt-2">
            <Text className="text-base text-fz-plum">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
