import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';


import { BackIcon, PinIcon } from '@/components/icons';
import { ErrorState, LoadingState } from '@/components/palora/ui';
import { brand, colors } from '@/constants/theme';
import { usePatchProfile, useProfile, useSetLocation } from '@/hooks/useDating';
import { getPosition } from '@/lib/native';

type GenderFilter = 'girls' | 'boys' | 'both';

const PLUM = brand.plum; // #4B164C
const SOFT = brand.soft; // #F8E7F6

function genderToLookingFor(filter: GenderFilter): string[] {
  switch (filter) {
    case 'girls':
      return ['woman'];
    case 'boys':
      return ['man'];
    case 'both':
      return ['woman', 'man'];
  }
}

function lookingForToGender(lf: string[]): GenderFilter {
  if (lf.length === 1 && lf[0] === 'woman') return 'girls';
  if (lf.length === 1 && lf[0] === 'man') return 'boys';
  return 'both';
}

/** Interactive touch track for single-value continuous slider (Distance) matching Palora theme */
function DistanceSlider({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(280);

  const updateFromX = (x: number) => {
    const clampedX = Math.max(0, Math.min(width, x));
    const ratio = clampedX / width;
    const rawVal = min + ratio * (max - min);
    const snapped = Math.round(rawVal / 5) * 5;
    onChange(Math.max(min, Math.min(max, snapped)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        updateFromX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateFromX(evt.nativeEvent.locationX);
      },
    }),
  ).current;

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const thumbLeft = Math.max(0, Math.min(width - 24, pct * (width - 24)));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
      className="h-12 justify-center py-2">
      {/* Background Track with Palora soft pill radius */}
      <View className="h-2 w-full rounded-full bg-fz-soft overflow-hidden">
        {/* Active Fill Track */}
        <View
          style={{ width: `${pct * 100}%`, backgroundColor: PLUM }}
          className="h-full rounded-full"
        />
      </View>

      {/* Draggable Circular Thumb matching Palora radius & shadow */}
      <View
        style={{
          position: 'absolute',
          left: thumbLeft,
          top: 12,
          shadowColor: PLUM,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
          backgroundColor: PLUM,
        }}
        className="h-6 w-6 items-center justify-center rounded-full border-2 border-white"
      />
    </View>
  );
}

/** Age range adjuster with +/- quick controls and visual track */
function AgeRangeControl({
  minAge,
  maxAge,
  onChangeMin,
  onChangeMax,
}: {
  minAge: number;
  maxAge: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
}) {
  const minPercent = ((minAge - 18) / (80 - 18)) * 100;
  const maxPercent = ((maxAge - 18) / (80 - 18)) * 100;

  return (
    <View className="gap-3">
      {/* Visual range track */}
      <View className="h-2 w-full rounded-full bg-fz-soft relative overflow-hidden my-2">
        <View
          style={{
            position: 'absolute',
            left: `${minPercent}%`,
            width: `${Math.max(5, maxPercent - minPercent)}%`,
            backgroundColor: PLUM,
          }}
          className="h-full rounded-full"
        />
      </View>

      {/* Stepper controls with rounded-2xl matching homepage cards */}
      <View className="flex-row items-center justify-between gap-3">
        {/* Min age stepper */}
        <View className="flex-1 flex-row items-center justify-between rounded-2xl border border-fz-border bg-white px-3.5 py-2.5">
          <Text className="text-xs text-fz-muted font-medium">Min Age</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => onChangeMin(Math.max(18, minAge - 1))}
              hitSlop={6}
              className="h-8 w-8 items-center justify-center rounded-full bg-fz-soft active:opacity-75">
              <Text className="text-base text-fz-plum font-bold">−</Text>
            </Pressable>
            <Text className="w-6 text-center text-sm font-bold text-fz-ink">{minAge}</Text>
            <Pressable
              onPress={() => onChangeMin(Math.min(maxAge, minAge + 1))}
              hitSlop={6}
              className="h-8 w-8 items-center justify-center rounded-full bg-fz-soft active:opacity-75">
              <Text className="text-base text-fz-plum font-bold">+</Text>
            </Pressable>
          </View>
        </View>

        {/* Max age stepper */}
        <View className="flex-1 flex-row items-center justify-between rounded-2xl border border-fz-border bg-white px-3.5 py-2.5">
          <Text className="text-xs text-fz-muted font-medium">Max Age</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => onChangeMax(Math.max(minAge, maxAge - 1))}
              hitSlop={6}
              className="h-8 w-8 items-center justify-center rounded-full bg-fz-soft active:opacity-75">
              <Text className="text-base text-fz-plum font-bold">−</Text>
            </Pressable>
            <Text className="w-6 text-center text-sm font-bold text-fz-ink">{maxAge}</Text>
            <Pressable
              onPress={() => onChangeMax(Math.min(99, maxAge + 1))}
              hitSlop={6}
              className="h-8 w-8 items-center justify-center rounded-full bg-fz-soft active:opacity-75">
              <Text className="text-base text-fz-plum font-bold">+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const me = useProfile();
  const patch = usePatchProfile();
  const setLocation = useSetLocation();

  const [genderFilter, setGenderFilter] = useState<GenderFilter>('both');
  const [city, setCity] = useState('');
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(35);
  const [maxKm, setMaxKm] = useState(40);

  useEffect(() => {
    if (!me.data) return;
    setGenderFilter(lookingForToGender(me.data.looking_for ?? []));
    setCity(me.data.city ?? '');
    setMinAge(me.data.min_age ?? 18);
    setMaxAge(me.data.max_age ?? 35);
    setMaxKm(me.data.max_distance_km ?? 40);
  }, [me.data]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(app)/me'));

  const handleClear = () => {
    setGenderFilter('both');
    setCity('');
    setMinAge(18);
    setMaxAge(50);
    setMaxKm(100);
  };

  const useMyLocation = async () => {
    try {
      const pos = await getPosition();
      const updated = await setLocation.mutateAsync(pos);
      if (updated.city) setCity(updated.city);
    } catch (e) {
      Alert.alert('Location', e instanceof Error ? e.message : 'Could not detect your location');
    }
  };

  const save = async () => {
    try {
      await patch.mutateAsync({
        looking_for: genderToLookingFor(genderFilter),
        city: city.trim(),
        min_age: Math.min(minAge, maxAge),
        max_age: Math.max(minAge, maxAge),
        max_distance_km: maxKm,
      });
      back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again');
    }
  };

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;

  const activeShadow = {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  };

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header matching Palora style */}
      <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-fz-border/60 bg-white">
        <Pressable onPress={back} hitSlop={12} className="h-10 w-10 items-center justify-center rounded-full border border-fz-ink/10 bg-white shadow-sm active:bg-fz-soft">
          <BackIcon size={20} color={colors.ink} />
        </Pressable>
        <Text className="text-2xl font-bold text-center text-fz-ink">Filters</Text>
        <Pressable onPress={handleClear} hitSlop={12} className="px-3 py-1.5 rounded-[32px] active:bg-fz-soft">
          <Text className="text-base font-semibold text-fz-plum">Clear</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 40 }}>
        
        {/* 1. Interested in Card (matching homepage SegmentToggle pill & active styling) */}
        <View className="rounded-3xl bg-white border border-fz-border/60 p-5 mb-4 shadow-sm">
          <Text className="mb-3 text-base font-bold text-fz-ink">Interested in</Text>
          <View className="h-11 w-full flex-row items-center rounded-2xl bg-fz-soft p-1">
            {(['girls', 'boys', 'both'] as const).map((key) => {
              const active = genderFilter === key;
              const label = key === 'girls' ? 'Girls' : key === 'boys' ? 'Boys' : 'Both';
              return (
                <Pressable
                  key={key}
                  onPress={() => setGenderFilter(key)}
                  style={active ? activeShadow : undefined}
                  className={`h-9 flex-1 items-center justify-center rounded-2xl ${
                    active ? 'bg-white' : 'bg-transparent'
                  }`}>
                  <Text
                    className={`text-sm text-center ${
                      active ? 'font-semibold text-fz-plum' : 'font-medium text-fz-plum/70'
                    }`}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. Location Card (Direct Editable City + GPS detector) */}
        <View className="rounded-3xl bg-white border border-fz-border/60 p-5 mb-4 shadow-sm">
          <Text className="mb-3 text-base font-bold text-fz-ink">Location</Text>
          <View className="relative h-14 rounded-2xl border border-fz-border bg-white px-4 flex-row items-center justify-between">
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Chicago, USA or Bengaluru"
              placeholderTextColor="#9EA3AE"
              className="flex-1 text-base font-medium text-fz-ink pr-2"
            />
            <Pressable
              onPress={useMyLocation}
              disabled={setLocation.isPending}
              className="flex-row items-center gap-1.5 bg-fz-soft px-3 py-1.5 rounded-[32px] active:opacity-75">
              {setLocation.isPending ? (
                <ActivityIndicator size="small" color={colors.plum} />
              ) : (
                <>
                  <PinIcon size={14} color={colors.plum} />
                  <Text className="text-xs font-bold text-fz-plum">GPS</Text>
                </>
              )}
            </Pressable>
          </View>
          <Text className="mt-2 text-xs text-fz-muted">
            Type any city to find people there, or tap GPS to use current coordinates.
          </Text>
        </View>

        {/* 3. Distance Card */}
        <View className="rounded-3xl bg-white border border-fz-border/60 p-5 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-bold text-fz-ink">Distance</Text>
            <View className="rounded-[32px] bg-fz-soft px-3.5 py-1">
              <Text className="text-xs font-bold text-fz-plum">
                {maxKm >= 200 ? 'Any distance (Global)' : `${maxKm} km`}
              </Text>
            </View>
          </View>
          <DistanceSlider value={maxKm} min={5} max={200} onChange={setMaxKm} />
          <Text className="text-xs text-fz-muted mt-1">
            {maxKm >= 200
              ? 'Showing people everywhere, sorted with closest first.'
              : `Prefers profiles within ~${maxKm} km, then expands outward.`}
          </Text>
        </View>

        {/* 4. Age Card */}
        <View className="rounded-3xl bg-white border border-fz-border/60 p-5 mb-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-bold text-fz-ink">Age Range</Text>
            <View className="rounded-[32px] bg-fz-soft px-3.5 py-1">
              <Text className="text-xs font-bold text-fz-plum">{minAge} – {maxAge} yrs</Text>
            </View>
          </View>
          <AgeRangeControl
            minAge={minAge}
            maxAge={maxAge}
            onChangeMin={setMinAge}
            onChangeMax={setMaxAge}
          />
        </View>

        {/* 5. Continue CTA Button */}
        <Pressable
          onPress={save}
          disabled={patch.isPending}
          className="h-14 rounded-[32px] bg-fz-plum items-center justify-center shadow-md active:opacity-90">
          {patch.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-bold text-white tracking-wide">Continue</Text>
          )}
        </Pressable>

      </KeyboardAwareScrollView>
    </View>
  );
}
