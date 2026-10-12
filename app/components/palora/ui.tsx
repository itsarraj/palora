import type { ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { brand, colors, initials, placeholderColor } from '@/constants/theme';
import { useFixtureMode } from '@/lib/fixture-mode';
import type { FeedPost } from '@/lib/fixtures';

// ---- primitives ---------------------------------------------------------------

const AVATAR = {
  sm: brand.size.avatarSm,
  md: brand.size.avatarMd,
  lg: brand.size.avatarLg,
  xl: brand.size.avatarXl,
  hero: brand.size.avatarHero,
} as const;

export function Avatar({
  name,
  size = 'lg',
  ring,
  uri,
}: {
  name: string;
  size?: keyof typeof AVATAR | number;
  ring?: boolean;
  uri?: string | null;
}) {
  const px = typeof size === 'number' ? size : AVATAR[size];
  const bg = placeholderColor(name);
  return (
    <View
      style={{
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: ring ? 2 : 0,
        borderColor: colors.pink,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: bg,
      }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: px * 0.32 }}>{initials(name)}</Text>
      )}
    </View>
  );
}

/** Photo with a name-seeded gradient placeholder and optional dark scrim. */
export function PhotoBackdrop({ uri, seed, scrim = 0.25 }: { uri?: string | null; seed: string; scrim?: number }) {
  return (
    <View className="absolute inset-0" style={{ backgroundColor: placeholderColor(seed) }}>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
      {scrim > 0 ? <View className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${scrim})` }} /> : null}
    </View>
  );
}

export function InterestChip({
  label,
  selected,
  onPress,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`mb-2 mr-2 rounded-[32px] border ${small ? 'px-3 py-1.5' : 'px-3.5 py-2'}`}
      style={{
        backgroundColor: selected ? colors.pink : '#fff',
        borderColor: selected ? colors.pink : 'rgba(75,22,76,0.2)',
      }}>
      <Text
        style={{
          color: selected ? '#fff' : colors.plum,
          fontSize: small ? 13 : 15,
          fontWeight: '500',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SegmentToggle({
  left = 'Make Friends',
  right = 'Search Partners',
  value,
  onChange,
}: {
  left?: string;
  right?: string;
  value: 'left' | 'right';
  onChange: (v: 'left' | 'right') => void;
}) {
  const activeShadow = {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  };

  return (
    <View className="fz-segment">
      <Pressable
        onPress={() => onChange('left')}
        style={value === 'left' ? activeShadow : undefined}
        className={value === 'left' ? 'fz-segment-active' : 'fz-segment-inactive'}>
        <Text className="fz-segment-text">{left}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('right')}
        style={value === 'right' ? activeShadow : undefined}
        className={value === 'right' ? 'fz-segment-active' : 'fz-segment-inactive'}>
        <Text className="fz-segment-text">{right}</Text>
      </Pressable>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'plum',
  className,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'plum' | 'pink' | 'ghost' | 'danger';
  className?: string;
}) {
  const bg =
    variant === 'plum' ? colors.plum : variant === 'pink' ? colors.pink : variant === 'danger' ? '#E5484D' : 'transparent';
  const fg = variant === 'ghost' ? colors.plum : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`fz-btn rounded-[32px] ${variant === 'ghost' ? 'fz-btn-outline bg-transparent' : variant === 'pink' ? 'bg-fz-pink' : variant === 'danger' ? 'bg-fz-danger' : ''} ${className ?? ''}`}
      style={{
        backgroundColor: variant === 'ghost' ? 'transparent' : bg,
        opacity: disabled || loading ? 0.6 : 1,
        shadowColor: variant === 'ghost' ? 'transparent' : colors.plum,
        shadowOpacity: variant === 'ghost' ? 0 : 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{label}</Text>}
    </Pressable>
  );
}

export function IconButton({
  onPress,
  children,
  light,
  className,
}: {
  onPress?: () => void;
  children: ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className={`h-10 w-10 items-center justify-center rounded-full border ${light ? 'border-white/20 bg-white/10' : 'border-fz-ink/10 bg-white'} active:bg-fz-soft ${className ?? ''}`}>
      {children}
    </Pressable>
  );
}

// ---- screen states ------------------------------------------------------------

export function LoadingState({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator color={colors.plum} />
      {label ? <Text className="mt-3 text-sm text-fz-muted">{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  emoji = '🫧',
  title,
  body,
  actionLabel,
  onAction,
}: {
  emoji?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-5xl">{emoji}</Text>
      <Text className="mt-4 text-center text-xl text-fz-plum">{title}</Text>
      {body ? <Text className="mt-2 text-center text-sm text-fz-muted">{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} className="fz-btn mt-6 px-6">
          <Text className="text-base text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <EmptyState emoji="⚠️" title="Couldn’t load" body={msg} actionLabel={onRetry ? 'Try again' : undefined} onAction={onRetry} />
  );
}

/** Dev-only: shown when reads are served from fixtures because the BFF is unreachable. */
export function OfflineBanner() {
  const { active } = useFixtureMode();
  if (!__DEV__ || !active) return null;
  return (
    <View className="mx-4 mb-2 rounded-lg bg-[#FFF3CD] px-3 py-2">
      <Text className="fz-label text-[#7A5A00]">BFF unreachable — showing sample data. Start the server or run adb reverse.</Text>
    </View>
  );
}

export function refreshControl(refreshing: boolean, onRefresh: () => void) {
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.plum} colors={[colors.plum]} />;
}

// ---- cards --------------------------------------------------------------------

export function StoryRail({
  stories,
  onAdd,
  onPress,
}: {
  stories: { id: string; name: string; photoUrl?: string; isSelf?: boolean }[];
  onAdd?: () => void;
  onPress?: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: brand.size.page, gap: brand.size.storyGap }}>
      {stories.map((s) => {
        if (s.isSelf) {
          return (
            <Pressable
              key={s.id}
              onPress={() => onAdd?.()}
              className="fz-story-self">
              <View className="relative h-[60px] w-[60px]">
                <View
                  className="h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full"
                  style={{ backgroundColor: placeholderColor(s.name) }}>
                  {s.photoUrl ? (
                    <Image source={{ uri: s.photoUrl }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>{initials(s.name)}</Text>
                  )}
                </View>
                <View className="absolute bottom-0 right-0">
                  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                    <Circle cx="10" cy="10" r="9" fill={colors.pink} stroke={colors.canvas} strokeWidth="2" />
                    <Path
                      d="M10 7.66675V12.3334"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M7.6665 10H12.3332"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </View>
              <Text className="fz-story-text" numberOfLines={1}>
                My Story
              </Text>
            </Pressable>
          );
        }

        const firstName = s.name.split(' ')[0];

        return (
          <Pressable
            key={s.id}
            onPress={() => onPress?.(s.id)}
            className="fz-story-item">
            <View className="fz-story-ring">
              <View
                className="fz-story-avatar"
                style={{ backgroundColor: placeholderColor(s.name) }}>
                {s.photoUrl ? (
                  <Image source={{ uri: s.photoUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{initials(s.name)}</Text>
                )}
              </View>
            </View>
            <Text className="fz-story-text" numberOfLines={1}>
              {firstName}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * The person-level action on a feed card. Distinct from liking the post:
 * this is a swipe-like on the author, so a mutual one becomes a match.
 */
export function formatCategory(cat?: string): { emoji: string; label: string } {
  if (!cat) return { emoji: '✨', label: 'General' };
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)$/u;
  const match = cat.match(emojiRegex);
  if (match) {
    return { emoji: match[1], label: match[2].trim() || cat };
  }
  const lower = cat.toLowerCase();
  if (lower.includes('travel')) return { emoji: '🏝', label: cat };
  if (lower.includes('foot') || lower.includes('sport')) return { emoji: '⚽️', label: cat };
  if (lower.includes('music')) return { emoji: '🎵', label: cat };
  if (lower.includes('food') || lower.includes('cook')) return { emoji: '🍜', label: cat };
  if (lower.includes('tech') || lower.includes('code')) return { emoji: '💻', label: cat };
  if (lower.includes('book') || lower.includes('read')) return { emoji: '📚', label: cat };
  if (lower.includes('movie') || lower.includes('film')) return { emoji: '🎬', label: cat };
  if (lower.includes('art') || lower.includes('design')) return { emoji: '🎨', label: cat };
  if (lower.includes('dating') || lower.includes('partner') || lower.includes('love')) return { emoji: '💫', label: cat };
  return { emoji: '✨', label: cat };
}

export function ConnectButton({
  relation,
  label,
  sentLabel,
  onConnect,
  onMessage,
  pending,
}: {
  relation: FeedPost['relation'];
  label: string;
  sentLabel: string;
  onConnect?: () => void;
  onMessage?: () => void;
  pending?: boolean;
}) {
  if (relation === 'self') return null;
  if (relation === 'matched') {
    return (
      <Pressable onPress={onMessage} hitSlop={8} className="h-8 flex-row items-center rounded-full bg-white px-3.5">
        <Text className="text-xs font-semibold text-fz-plum">Message</Text>
      </Pressable>
    );
  }
  if (relation === 'liked') {
    return (
      <View className="h-8 flex-row items-center rounded-full border border-white/50 bg-white/20 px-3.5">
        <Text className="text-xs font-medium text-white">{sentLabel} ✓</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onConnect}
      disabled={pending}
      hitSlop={6}
      className="h-8 flex-row items-center rounded-full px-3.5"
      style={{ backgroundColor: colors.pink, opacity: pending ? 0.6 : 1 }}>
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

export function FeedPostCard({
  post,
  onPress,
  onLike,
  onComment,
  onMore,
  onAuthor,
  connect,
}: {
  post: FeedPost;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onMore?: () => void;
  onAuthor?: () => void;
  connect?: { label: string; sentLabel: string; onConnect: () => void; onMessage: () => void; pending?: boolean };
}) {
  const { emoji, label: catLabel } = formatCategory(post.category);

  return (
    <Pressable onPress={onPress} className="fz-feed-card" style={{ height: brand.size.feedCard }}>
      {/* Photo Backdrop */}
      <PhotoBackdrop uri={post.authorPhotoUrl} seed={post.author} scrim={0.12} />

      {/* Smooth Dark Gradient Scrim across Bottom for Text Legibility */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={`cardGrad-${post.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.05" />
            <Stop offset="0.45" stopColor="#000" stopOpacity="0.18" />
            <Stop offset="0.72" stopColor="#000" stopOpacity="0.65" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.88" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#cardGrad-${post.id})`} />
      </Svg>

      {/* Top-Left Category Pill (Figma: rounded-[32px] bg-white/20 border-white/20 gap-1.5) */}
      <View className="fz-tag-pill absolute left-4 top-4">
        {emoji ? <Text className="text-base text-white">{emoji}</Text> : null}
        <Text className="text-base font-medium text-white">{catLabel}</Text>
      </View>

      {/* Right Side Action Rail (Figma SVG) */}
      <View className="absolute right-0 top-[75px]" pointerEvents="box-none">
        <Svg width={64} height={184} viewBox="0 0 64 184" fill="none">
          <Path
            d="M0 36C0 22.7452 10.7452 12 24 12H52C58.6274 12 64 6.62742 64 0V184C64 177.373 58.6274 172 52 172H24C10.7452 172 0 161.255 0 148V36Z"
            fill="white"
            fillOpacity={0.4}
          />
          <Rect
            x={6}
            y={106}
            width={20}
            height={3}
            rx={1.5}
            transform="rotate(-90 6 106)"
            fill="white"
            fillOpacity={0.5}
          />
          {/* Top circle (Like / Thumbs Up): cx=36 cy=40 r=20 */}
          <Circle
            cx={36}
            cy={40}
            r={20}
            fill={post.likedByMe ? colors.pink : 'white'}
            fillOpacity={post.likedByMe ? 0.95 : 0.4}
          />
          <Path
            d="M28 40.5C28 40.303 28.0388 40.108 28.1142 39.926C28.1896 39.744 28.3001 39.5786 28.4393 39.4393C28.5786 39.3001 28.744 39.1896 28.926 39.1142C29.108 39.0388 29.303 39 29.5 39C29.697 39 29.892 39.0388 30.074 39.1142C30.256 39.1896 30.4214 39.3001 30.5607 39.4393C30.6999 39.5786 30.8104 39.744 30.8858 39.926C30.9612 40.108 31 40.303 31 40.5V46.5C31 46.8978 30.842 47.2794 30.5607 47.5607C30.2794 47.842 29.8978 48 29.5 48C29.1022 48 28.7206 47.842 28.4393 47.5607C28.158 47.2794 28 46.8978 28 46.5V40.5ZM32 40.333V45.763C31.9998 46.1347 32.1032 46.499 32.2986 46.8152C32.4939 47.1314 32.7735 47.3869 33.106 47.553L33.156 47.578C33.7109 47.8553 34.3227 47.9998 34.943 48H40.359C40.8215 48.0002 41.2698 47.84 41.6276 47.5469C41.9853 47.2537 42.2303 46.8456 42.321 46.392L43.521 40.392C43.579 40.1019 43.5719 39.8025 43.5002 39.5154C43.4285 39.2284 43.294 38.9608 43.1065 38.732C42.9189 38.5032 42.6829 38.3189 42.4155 38.1923C42.148 38.0657 41.8559 38 41.56 38H38V34C38 33.4696 37.7893 32.9609 37.4142 32.5858C37.0391 32.2107 36.5304 32 36 32C35.7348 32 35.4804 32.1054 35.2929 32.2929C35.1054 32.4804 35 32.7348 35 33V33.667C35 34.5325 34.7193 35.3746 34.2 36.067L32.8 37.933C32.2807 38.6254 32 39.4675 32 40.333Z"
            fill="white"
          />

          {/* Middle circle (Comment / Speech Bubble): cx=36 cy=92 r=20 */}
          <Circle cx={36} cy={92} r={20} fill="white" fillOpacity={0.4} />
          <Path
            d="M43.5 91.5833C43.5028 92.6832 43.2459 93.7682 42.75 94.75C42.162 95.9265 41.2581 96.916 40.1395 97.6077C39.0209 98.2995 37.7319 98.6662 36.4167 98.6667C35.3168 98.6695 34.2318 98.4126 33.25 97.9167L28.5 99.5L30.0833 94.75C29.5874 93.7682 29.3305 92.6832 29.3333 91.5833C29.3338 90.2681 29.7005 88.9791 30.3923 87.8605C31.084 86.7419 32.0735 85.838 33.25 85.25C34.2318 84.7541 35.3168 84.4972 36.4167 84.5H36.8333C38.5703 84.5959 40.2109 85.329 41.4409 86.5591C42.671 87.7891 43.4042 89.4297 43.5 91.1667V91.5833Z"
            fill="white"
            stroke="white"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom circle (More / 3-Dots): cx=36 cy=144 r=20 */}
          <Circle cx={36} cy={144} r={20} fill="white" fillOpacity={0.4} />
          <Path
            d="M32 144C32 144.53 31.7893 145.039 31.4142 145.414C31.0391 145.789 30.5304 146 30 146C29.4696 146 28.9609 145.789 28.5858 145.414C28.2107 145.039 28 144.53 28 144C28 143.47 28.2107 142.961 28.5858 142.586C28.9609 142.211 29.4696 142 30 142C30.5304 142 31.0391 142.211 31.4142 142.586C31.7893 142.961 32 143.47 32 144ZM38 144C38 144.53 37.7893 145.039 37.4142 145.414C37.0391 145.789 36.5304 146 36 146C35.4696 146 34.9609 145.789 34.5858 145.414C34.2107 145.039 34 144.53 34 144C34 143.47 34.2107 142.961 34.5858 142.586C34.9609 142.211 35.4696 142 36 142C36.5304 142 37.0391 142.211 37.4142 142.586C37.7893 142.961 38 143.47 38 144ZM42 146C42.5304 146 43.0391 145.789 43.4142 145.414C43.7893 145.039 44 144.53 44 144C44 143.47 43.7893 142.961 43.4142 142.586C43.0391 142.211 42.5304 142 42 142C41.4696 142 40.9609 142.211 40.5858 142.586C40.2107 142.961 40 143.47 40 144C40 144.53 40.2107 145.039 40.5858 145.414C40.9609 145.789 41.4696 146 42 146Z"
            fill="white"
          />
        </Svg>

        {/* Action 1: Like / Thumbs Up (center at x=36, y=40, r=20) */}
        <Pressable
          onPress={onLike}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Like"
          style={{ position: 'absolute', left: 16, top: 20, width: 40, height: 40, borderRadius: 20 }}
        />

        {/* Action 2: Comment / Speech Bubble (center at x=36, y=92, r=20) */}
        <Pressable
          onPress={onComment}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Comments"
          style={{ position: 'absolute', left: 16, top: 72, width: 40, height: 40, borderRadius: 20 }}
        />

        {/* Action 3: More / 3 Dots (center at x=36, y=144, r=20) */}
        <Pressable
          onPress={onMore}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="More options"
          style={{ position: 'absolute', left: 16, top: 124, width: 40, height: 40, borderRadius: 20 }}
        />
      </View>

      {/* Bottom Area: Question & Author Row */}
      <View className="absolute bottom-0 left-0 right-0 p-4">
        {/* Question Text */}
        <Text
          className="mb-3.5 max-w-[248px] text-xl font-bold leading-7 text-white"
          numberOfLines={3}
          style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
          {post.question}
        </Text>

        {/* Author + Connect Row */}
        <View className="flex-row items-center justify-between">
          <Pressable onPress={onAuthor} hitSlop={6} className="flex-row items-center gap-2.5">
            <Avatar name={post.author} size="md" uri={post.authorPhotoUrl} />
            <View>
              <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                {post.author}
              </Text>
              <Text className="text-[11px] font-medium uppercase tracking-wider text-white/70" numberOfLines={1}>
                {post.city}
              </Text>
            </View>
          </Pressable>

          {connect ? (
            <ConnectButton
              relation={post.relation}
              label={connect.label}
              sentLabel={connect.sentLabel}
              onConnect={connect.onConnect}
              onMessage={connect.onMessage}
              pending={connect.pending}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function MessageRow({
  item,
  onPress,
  onLongPress,
}: {
  item: { id: string; name: string; preview: string; time: string; unread?: boolean; photoUrl?: string };
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="h-[84px] w-full flex-row items-center">
      <View
        className="mr-3.5 h-14 w-14 items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: placeholderColor(item.name) }}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{initials(item.name)}</Text>
        )}
      </View>
      <View className="flex-1 justify-center pr-2">
        <Text className="text-lg font-semibold text-fz-ink" numberOfLines={1}>
          {item.name}
        </Text>
        <Text
          className={`mt-0.5 text-sm ${item.unread ? 'font-medium text-fz-ink' : 'text-fz-muted'}`}
          numberOfLines={1}>
          {item.preview}
        </Text>
      </View>
      <View className="h-11 items-end justify-between py-0.5">
        {item.unread ? <View className="h-3 w-3 rounded-full bg-fz-pink" /> : <View className="h-3 w-3" />}
        <Text className="text-sm text-[#9ea3ae]">{item.time}</Text>
      </View>
    </Pressable>
  );
}

export function formatKm(km: number): string {
  if (km < 1) return '< 1 km away';
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
