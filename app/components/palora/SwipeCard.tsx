import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BackIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, HeartIcon, PinIcon, StarIcon } from '@/components/icons';
import { IconButton, InterestChip, PhotoBackdrop, formatKm } from '@/components/palora/ui';
import { colors } from '@/constants/theme';
import type { Person } from '@/lib/fixtures';
import { MODE_COPY, MODE_LABEL, type Mode } from '@/lib/mode';
import type { SwipeAction } from '@/services/datingApi';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 110;
const SHEET_HEIGHT = Math.min(Math.round(SCREEN_H * 0.7), 560);

export type SwipeCardProps = {
  person: Person;
  /** Fired after the fling-off animation completes. */
  onSwipe: (action: SwipeAction, person: Person) => void;
  onBack?: () => void;
  onMore?: () => void;
  /** Extra bottom padding under the action bar (tab bar height). */
  bottomInset?: number;
  /** False when a docked tab bar already owns the home-indicator inset. */
  respectSafeArea?: boolean;
  /** Browsing mode: changes the stamp/copy. Shown as a pill when onModePress is given. */
  mode?: Mode;
  onModePress?: () => void;
};

export function SwipeCard({
  person,
  onSwipe,
  onBack,
  onMore,
  bottomInset = 0,
  respectSafeArea = true,
  mode = 'partner',
  onModePress,
}: SwipeCardProps) {
  const copy = MODE_COPY[mode];
  const insets = useSafeAreaInsets();
  const tx = useSharedValue(0);
  const leaving = useSharedValue(0);
  const sheetProgress = useSharedValue(0); // 0 = closed, 1 = open
  const [sheetOpenState, setSheetOpenState] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = person.photos.length ? person.photos : person.photoUrl ? [{ id: 'p', url: person.photoUrl, position: 0 }] : [];

  const bottomPadding = (respectSafeArea ? insets.bottom : 0) + bottomInset;

  useEffect(() => {
    tx.value = 0;
    leaving.value = 0;
    sheetProgress.value = 0;
    setSheetOpenState(false);
    setPhotoIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person.id]);

  const commit = useCallback(
    (action: SwipeAction) => {
      onSwipe(action, person);
    },
    [onSwipe, person],
  );

  const flingOff = useCallback(
    (action: SwipeAction) => {
      if (leaving.value) return;
      leaving.value = 1;
      sheetProgress.value = withTiming(0, { duration: 150 });
      const dir = action === 'pass' ? -1 : 1;
      tx.value = withTiming(dir * SCREEN_W * 1.2, { duration: 220 }, (done) => {
        if (done) scheduleOnRN(commit, action);
      });
    },
    [commit, leaving, sheetProgress, tx],
  );

  const openSheet = useCallback(() => {
    setSheetOpenState(true);
    sheetProgress.value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [sheetProgress]);

  const closeSheet = useCallback(() => {
    sheetProgress.value = withTiming(
      0,
      { duration: 200, easing: Easing.inOut(Easing.quad) },
      (done) => {
        if (done) scheduleOnRN(setSheetOpenState, false);
      },
    );
  }, [sheetProgress]);

  const horizontalPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-15, 15])
        .onUpdate((e) => {
          if (leaving.value || sheetProgress.value > 0.1) return;
          tx.value = e.translationX;
        })
        .onEnd((e) => {
          if (leaving.value || sheetProgress.value > 0.1) return;
          if (e.translationX > SWIPE_THRESHOLD) {
            leaving.value = 1;
            tx.value = withTiming(SCREEN_W * 1.2, { duration: 220 }, (done) => {
              if (done) scheduleOnRN(commit, 'like');
            });
          } else if (e.translationX < -SWIPE_THRESHOLD) {
            leaving.value = 1;
            tx.value = withTiming(-SCREEN_W * 1.2, { duration: 220 }, (done) => {
              if (done) scheduleOnRN(commit, 'pass');
            });
          } else {
            tx.value = withSpring(0);
          }
        }),
    [commit, leaving, sheetProgress, tx],
  );

  const verticalPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .failOffsetX([-20, 20])
        .onUpdate((e) => {
          if (leaving.value) return;
          if (sheetProgress.value < 0.5) {
            // Dragging up to open
            if (e.translationY < 0) {
              sheetProgress.value = Math.min(1, Math.max(0, -e.translationY / SHEET_HEIGHT));
            }
          } else {
            // Dragging down to close
            if (e.translationY > 0) {
              sheetProgress.value = Math.min(1, Math.max(0, 1 - e.translationY / SHEET_HEIGHT));
            }
          }
        })
        .onEnd((e) => {
          if (leaving.value) return;
          if (sheetProgress.value < 0.5) {
            if (e.translationY < -30 || e.velocityY < -200) {
              scheduleOnRN(setSheetOpenState, true);
              sheetProgress.value = withTiming(1, {
                duration: 240,
                easing: Easing.out(Easing.cubic),
              });
            } else {
              sheetProgress.value = withTiming(0, {
                duration: 180,
                easing: Easing.inOut(Easing.quad),
              });
            }
          } else {
            if (e.translationY > 30 || e.velocityY > 200) {
              sheetProgress.value = withTiming(
                0,
                { duration: 200, easing: Easing.inOut(Easing.quad) },
                (done) => {
                  if (done) scheduleOnRN(setSheetOpenState, false);
                },
              );
            } else {
              sheetProgress.value = withTiming(1, {
                duration: 200,
                easing: Easing.out(Easing.cubic),
              });
            }
          }
        }),
    [leaving, sheetProgress],
  );

  const composedGesture = useMemo(() => Gesture.Race(horizontalPan, verticalPan), [horizontalPan, verticalPan]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotate: `${interpolate(tx.value, [-SCREEN_W, 0, SCREEN_W], [-12, 0, 12])}deg` },
    ],
  }));

  const likeStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [40, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const passStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-SWIPE_THRESHOLD, -40], [1, 0], 'clamp'),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetProgress.value > 0.01 ? 1 : 0,
    transform: [
      {
        translateY: interpolate(sheetProgress.value, [0, 1], [SHEET_HEIGHT, 0], 'clamp'),
      },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetProgress.value, [0, 1], [0, 0.45], 'clamp'),
  }));

  const collapsedInfoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetProgress.value, [0, 0.35], [1, 0], 'clamp'),
    transform: [
      {
        translateY: interpolate(sheetProgress.value, [0, 1], [0, 20], 'clamp'),
      },
    ],
  }));

  const stamp = (side: 'left' | 'right') => ({
    position: 'absolute' as const,
    top: insets.top + 72,
    [side]: 24,
    borderWidth: 3,
    borderColor: side === 'left' ? colors.pink : colors.plum,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 30,
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[{ flex: 1, backgroundColor: colors.ink, overflow: 'hidden' }, cardStyle]}>
        {/* Full-screen photo */}
        <PhotoBackdrop uri={photos[photoIdx]?.url} seed={person.name} scrim={0.12} />

        {/* Bottom gradient fade for text & action button contrast */}
        <View className="absolute bottom-0 left-0 right-0 h-80" pointerEvents="none">
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient id="photoBottomScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="0.45" stopColor="#000000" stopOpacity="0.4" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0.88" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#photoBottomScrim)" />
          </Svg>
        </View>

        {/* Tap left/right half of the photo to page through photos */}
        {photos.length > 1 && !sheetOpenState ? (
          <View className="absolute left-0 right-0 top-0 flex-row" style={{ bottom: bottomPadding + 140 }}>
            <Pressable className="flex-1" onPress={() => setPhotoIdx((i) => Math.max(0, i - 1))} />
            <Pressable className="flex-1" onPress={() => setPhotoIdx((i) => Math.min(photos.length - 1, i + 1))} />
          </View>
        ) : null}

        {/* Photo indicator dashes */}
        {photos.length > 1 ? (
          <View className="absolute left-4 right-4 flex-row gap-1" style={{ top: insets.top + 4 }}>
            {photos.map((p, i) => (
              <View
                key={p.id}
                className="h-1 flex-1 rounded-full"
                style={{ backgroundColor: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </View>
        ) : null}

        {/* Swipe stamps */}
        <Animated.View style={[stamp('left'), likeStamp]}>
          <Text className="text-2xl font-bold text-fz-pink">{copy.stamp}</Text>
        </Animated.View>
        <Animated.View style={[stamp('right'), passStamp]}>
          <Text className="text-2xl font-bold text-fz-plum">NOPE</Text>
        </Animated.View>

        {/* Top header navigation */}
        <View className="absolute left-0 right-0 top-0 z-20 flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 12 }}>
          {onBack ? (
            <IconButton onPress={onBack} light>
              <BackIcon color="#fff" />
            </IconButton>
          ) : (
            <View className="w-10" />
          )}
          {onModePress ? (
            <Pressable onPress={onModePress} hitSlop={8} className="flex-row items-center gap-1 rounded-3xl border border-white/40 bg-white/20 px-3 py-2">
              <Text className="text-base text-white">{MODE_LABEL[mode]}</Text>
              <Text className="text-xs text-white/80">▾</Text>
            </Pressable>
          ) : null}
          <View className="flex-row items-center gap-2">
            {person.distanceKm != null ? (
              <View className="rounded-3xl border border-white/40 bg-white/20 px-3 py-2">
                <Text className="text-base text-white">✈ {formatKm(person.distanceKm)}</Text>
              </View>
            ) : null}
            {onMore ? (
              <IconButton onPress={onMore} light>
                <Text className="text-lg font-bold text-white">⋯</Text>
              </IconButton>
            ) : null}
          </View>
        </View>

        {/* Collapsed view info bar over photo: Name, Age, City and About ⌃ button */}
        <Animated.View
          className="absolute left-0 right-0 px-5 z-10"
          style={[{ bottom: bottomPadding + 96 }, collapsedInfoStyle]}
          pointerEvents={sheetOpenState ? 'none' : 'box-none'}>
          <View className="flex-row items-end justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-3xl font-bold text-white tracking-tight">{person.name}</Text>
                <Text className="text-2xl font-semibold text-white/90">{person.age}</Text>
              </View>
              <View className="mt-1 flex-row items-center gap-1.5">
                <PinIcon size={16} color="#fff" />
                <Text className="text-sm font-medium text-white/90">{person.city}</Text>
                {person.distanceKm != null ? (
                  <Text className="text-sm text-white/70">• {formatKm(person.distanceKm)} away</Text>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={openSheet}
              hitSlop={10}
              className="flex-row items-center gap-1.5 rounded-full border border-white/30 bg-black/30 px-3.5 py-2">
              <Text className="text-xs font-semibold uppercase tracking-wider text-white">About</Text>
              <ChevronUpIcon size={14} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>

        {/* Dim backdrop when sheet is expanded */}
        <Animated.View
          pointerEvents={sheetOpenState ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: 15 }, backdropStyle]}>
          <Pressable className="flex-1" onPress={closeSheet} />
        </Animated.View>

        {/* Expandable About & Profile Details Sheet */}
        <Animated.View
          className="fz-sheet absolute bottom-0 left-0 right-0 z-20 bg-white"
          style={[
            {
              height: SHEET_HEIGHT,
              paddingBottom: bottomPadding + 92,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 16,
            },
            sheetStyle,
          ]}
          pointerEvents={sheetOpenState ? 'auto' : 'none'}>
          {/* Header row with handle and close */}
          <View className="px-5 pt-3 pb-2 border-b border-fz-border/50">
            <View className="fz-handle mb-3" />
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-2xl font-bold text-fz-plum">{person.name}</Text>
                  <Text className="text-xl font-semibold text-fz-muted">{person.age}</Text>
                </View>
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <PinIcon size={14} color={colors.muted} />
                  <Text className="text-xs font-medium text-fz-muted">{person.city}</Text>
                  {person.distanceKm != null ? (
                    <Text className="text-xs text-fz-muted/80">• {formatKm(person.distanceKm)} away</Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={closeSheet}
                hitSlop={12}
                className="h-9 w-9 items-center justify-center rounded-full bg-fz-soft">
                <ChevronDownIcon size={20} color={colors.plum} />
              </Pressable>
            </View>
          </View>

          {/* Scrollable details: About, Interests, Intent, and Match percentage at bottom */}
          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            bounces={false}
            overScrollMode="never">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-fz-muted">About</Text>
              <Text className="mt-2 text-base leading-6 text-fz-ink">
                {person.about || 'No bio yet.'}
              </Text>
            </View>

            {person.interests && person.interests.length > 0 ? (
              <View className="mt-5">
                <Text className="text-xs font-bold uppercase tracking-wider text-fz-muted">Interests</Text>
                <View className="mt-2 flex-row flex-wrap">
                  {person.interests.map((interest) => (
                    <InterestChip key={interest} label={interest} small />
                  ))}
                </View>
              </View>
            ) : null}

            {person.intent ? (
              <View className="mt-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-fz-muted">Looking For</Text>
                <View className="mt-2 self-start rounded-[32px] bg-fz-soft px-3.5 py-1.5 border border-fz-pink/20">
                  <Text className="text-xs font-semibold text-fz-plum capitalize">{person.intent}</Text>
                </View>
              </View>
            ) : null}

            {/* Match & Match Percentage Card at the bottom */}
            <View className="mt-6 rounded-3xl border border-fz-pink/30 bg-fz-soft/40 p-4">
              <View className="flex-row items-center gap-4">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-fz-plum shadow-sm">
                  <View className="absolute inset-0 rounded-full border-[3px] border-fz-pink/30" />
                  <View
                    className="absolute inset-0 rounded-full border-[3px] border-fz-pink"
                    style={{
                      borderTopColor: 'transparent',
                      borderLeftColor: person.matchPercent < 75 ? 'transparent' : colors.pink,
                    }}
                  />
                  <Text className="text-sm font-bold text-white">{person.matchPercent}%</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-fz-plum">
                    {person.matchPercent}% Match
                  </Text>
                  <Text className="mt-0.5 text-xs leading-4 text-fz-muted">
                    {mode === 'friends'
                      ? 'Strong friendship chemistry based on your shared vibes and preferences.'
                      : 'High dating chemistry based on mutual preferences and interests.'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="h-16" />
          </ScrollView>
        </Animated.View>

        {/* Action Buttons: Pass, Superlike, Like */}
        <View
          className="absolute bottom-0 left-0 right-0 z-30 flex-row items-center justify-center gap-8 self-center pb-2 pointer-events-box-none"
          style={{ bottom: bottomPadding + 16 }}>
          <RoundButton onPress={() => flingOff('pass')} bg="#fff">
            <CloseIcon size={28} />
          </RoundButton>
          <RoundButton onPress={() => flingOff('superlike')} bg={colors.plum}>
            <StarIcon size={26} />
          </RoundButton>
          <RoundButton onPress={() => flingOff('like')} bg={colors.pink}>
            <HeartIcon size={26} color="#fff" filled />
          </RoundButton>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function RoundButton({ onPress, bg, children }: { onPress: () => void; bg: string; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-14 w-14 items-center justify-center rounded-full"
      style={{
        backgroundColor: bg,
        shadowColor: colors.plum,
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}>
      {children}
    </Pressable>
  );
}
