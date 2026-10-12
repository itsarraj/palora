import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Href } from 'expo-router';
import { router, usePathname } from 'expo-router';

import { HeartIcon, HomeIcon, MessagesIcon } from '@/components/icons';
import { brand } from '@/constants/theme';

const TABS: { href: Href; match: string; label: string; Icon: typeof HomeIcon }[] = [
  { href: '/(app)', match: '/(app)', label: 'Home', Icon: HomeIcon },
  { href: '/(app)/create', match: '/create', label: 'Swipe', Icon: HeartIcon },
  { href: '/(app)/messages', match: '/messages', label: 'Messages', Icon: MessagesIcon },
];

/** Full-screen routes (chat, a profile, a form) drop the bar so they can use the bottom edge. */
const HIDDEN_ON = ['/profile/', '/chat/', '/post/', '/edit-profile', '/preferences', '/blocked', '/new-post', '/change-password', '/settings'];

function isActive(pathname: string, match: string): boolean {
  const cleanPath = pathname.split('?')[0].replace(/^\/\(app\)/, '') || '/';
  if (match === '/(app)' || match === '/') {
    return cleanPath === '/' || cleanPath === '/index';
  }
  const cleanMatch = match.replace(/^\/\(app\)/, '').replace(/^\//, '');
  const segments = cleanPath.split('/').filter(Boolean);
  return segments[0] === cleanMatch;
}

export function PaloraTabBar() {
  const insets = useSafeAreaInsets();
  let pathname = '/(app)';
  try {
    pathname = usePathname();
  } catch {
    // Navigation container not mounted yet
  }

  if (HIDDEN_ON.some((p) => pathname.includes(p))) {
    return null;
  }

  return (
    <View style={{ backgroundColor: brand.white, borderTopWidth: 1, borderTopColor: brand.border, paddingBottom: insets.bottom }}>
      <View className="h-16 flex-row">
        {TABS.map(({ href, match, label, Icon }) => {
          const active = isActive(pathname, match);
          const color = active ? brand.plum : brand.muted;
          return (
            <Pressable key={match} onPress={() => router.replace(href)} className="flex-1 items-center justify-center gap-1">
              <Icon color={color} active={active} size={22} />
              <Text className="text-xs" style={{ color }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
