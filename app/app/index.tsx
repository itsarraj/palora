import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';

import { useSession } from '@/hooks/useAuth';

export default function Index() {
  const session = useSession();

  useEffect(() => {
    if (session.isLoading) return;
    if (session.data?.hasToken) {
      router.replace('/(app)');
    } else {
      router.replace('/welcome');
    }
  }, [session.isLoading, session.data?.hasToken]);

  return (
    <View className="flex-1 items-center justify-center bg-fz-canvas">
      <ActivityIndicator color="#4B164C" />
    </View>
  );
}
