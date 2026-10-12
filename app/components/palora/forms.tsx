import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { BackIcon, CameraIcon } from '@/components/icons';
import { IconButton, InterestChip } from '@/components/palora/ui';
import { colors } from '@/constants/theme';
import { useDeletePhoto, useReorderPhotos, useUploadPhoto } from '@/hooks/useDating';
import { type Photo } from '@/lib/fixtures';
import { pickPhoto } from '@/lib/native';

export { BirthdayField, BirthdayPickerSheet, formatBirthday, getAgeFromBirthday } from './BirthdayPicker';


export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & TextInputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fz-muted">{label}</Text>
      <TextInput
        placeholderTextColor="#9EA3AE"
        {...input}
        className={`${input.multiline ? 'fz-input-area' : 'fz-input'} ${input.className ?? ''}`}
      />
      {hint ? <Text className="mt-1 text-xs text-fz-muted">{hint}</Text> : null}
    </View>
  );
}

export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  multiple,
}: {
  label?: string;
  options: readonly { id: T; label: string }[];
  value: T[] | T | null;
  onChange: (v: T) => void;
  multiple?: boolean;
}) {
  const selected = (id: T) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <View className="mb-4">
      {label ? <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-fz-muted">{label}</Text> : null}
      <View className="flex-row flex-wrap">
        {options.map((o) => (
          <InterestChip key={o.id} label={o.label} selected={selected(o.id)} onPress={() => onChange(o.id)} />
        ))}
      </View>
      {multiple ? <Text className="text-xs text-fz-muted">Pick any that apply</Text> : null}
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const btn = (delta: number, glyph: string) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      hitSlop={6}
      className="h-8 w-8 items-center justify-center rounded-full bg-fz-soft active:opacity-75">
      <Text className="text-base font-bold text-fz-plum">{glyph}</Text>
    </Pressable>
  );
  return (
    <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-fz-border bg-white px-4 py-3">
      <Text className="text-base font-medium text-fz-ink">{label}</Text>
      <View className="flex-row items-center gap-2.5">
        {btn(-step, '−')}
        <Text className="w-16 text-center text-sm font-bold text-fz-plum">
          {value}
          {unit ? ` ${unit}` : ''}
        </Text>
        {btn(step, '+')}
      </View>
    </View>
  );
}

/** 3×2 photo grid. First photo is the main one. JPG, PNG, WEBP, or HEIC. */
export function PhotoGrid({ photos, max = 6 }: { photos: Photo[]; max?: number }) {
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const reorder = useReorderPhotos();
  const [busy, setBusy] = useState(false);

  const add = async (source: 'library' | 'camera') => {
    try {
      setBusy(true);
      const picked = await pickPhoto(source);
      if (picked) await upload.mutateAsync(picked);
    } catch (e) {
      Alert.alert('Could not add photo', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const chooseSource = () =>
    Alert.alert('Add photo', undefined, [
      { text: 'Choose from library', onPress: () => add('library') },
      { text: 'Take a photo', onPress: () => add('camera') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const onPressPhoto = (p: Photo, i: number) =>
    Alert.alert('Photo', undefined, [
      ...(i > 0 ? [{ text: 'Make main photo', onPress: () => reorder.mutate([p.id, ...photos.filter((x) => x.id !== p.id).map((x) => x.id)]) }] : []),
      { text: 'Remove', style: 'destructive' as const, onPress: () => remove.mutate(p.id) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const slots = Array.from({ length: max }, (_, i) => photos[i] ?? null);
  return (
    <View className="mb-4">
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-fz-muted">Photos</Text>
      <Text className="mb-2 text-xs text-fz-muted">JPG, PNG, WEBP, or HEIC. The first photo is the one people see.</Text>
      <View className="flex-row flex-wrap justify-between" style={{ rowGap: 10 }}>
        {slots.map((p, i) =>
          p ? (
            <Pressable key={p.id} onPress={() => onPressPhoto(p, i)} className="w-[31%] overflow-hidden rounded-2xl" style={{ aspectRatio: 4 / 5 }}>
              <Image source={{ uri: p.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              {i === 0 ? (
                <View className="absolute bottom-1.5 left-1.5 rounded-full bg-fz-pink px-2 py-0.5">
                  <Text className="text-xs text-white">Main</Text>
                </View>
              ) : null}
            </Pressable>
          ) : (
            <Pressable
              key={`empty-${i}`}
              onPress={chooseSource}
              disabled={busy || i > photos.length}
              className="w-[31%] items-center justify-center rounded-2xl border border-dashed border-fz-pink/60 bg-fz-soft"
              style={{ aspectRatio: 4 / 5, opacity: i > photos.length ? 0.4 : 1 }}>
              {busy && i === photos.length ? <ActivityIndicator color={colors.plum} /> : <CameraIcon color={colors.pink} />}
            </Pressable>
          ),
        )}
      </View>
      <Text className="mt-2 text-xs text-fz-muted">Tap a photo to make it main or remove it. JPG, PNG, WebP or HEIC up to 8 MB.</Text>
    </View>
  );
}

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <IconButton onPress={onBack}>
        <BackIcon size={20} color={colors.ink} />
      </IconButton>
      <Text className="flex-1 text-center text-2xl font-bold text-fz-ink mx-2" numberOfLines={1}>
        {title}
      </Text>
      <View className="h-10 w-10 items-center justify-center">{right ?? <View className="h-10 w-10" />}</View>
    </View>
  );
}

export function isValidBirthday(s: string): { ok: true; age: number } | { ok: false; reason: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, reason: 'Use YYYY-MM-DD' };
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return { ok: false, reason: 'Not a real date' };
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  if (age < 18) return { ok: false, reason: 'You must be 18 or older' };
  if (age > 100) return { ok: false, reason: 'Check the year' };
  return { ok: true, age };
}
