import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { PaloraTabBar } from '@/components/palora/TabBar';
import { brand } from '@/constants/brand';
import { useSession } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useDating';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useModeBootstrap } from '@/lib/mode';

export default function AppLayout() {
  const session = useSession();
  const hasToken = Boolean(session.data?.hasToken);
  const profile = useProfile(hasToken);
  usePushRegistration(hasToken && profile.data?.onboarding_complete === true);
  // Friends | Dating: restore the saved mode, or start from the onboarding intent.
  useModeBootstrap(profile.data?.intent);

  if (session.isLoading || (hasToken && profile.isLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-fz-canvas">
        <ActivityIndicator color={brand.plum} />
      </View>
    );
  }

  if (!hasToken) {
    return <Redirect href="/welcome" />;
  }

  // A profile row exists for every account; block the tabs until the basics are filled in.
  if (profile.data && !profile.data.onboarding_complete) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      tabBar={() => <PaloraTabBar />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: brand.canvas },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="create" options={{ title: 'Match' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="me" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="preferences" options={{ href: null }} />
      <Tabs.Screen name="blocked" options={{ href: null }} />
      <Tabs.Screen name="new-post" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
      <Tabs.Screen name="profile/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="post/[id]" options={{ href: null }} />
    </Tabs>
  );
}
