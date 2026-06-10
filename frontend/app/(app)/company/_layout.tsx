import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLoader from '@components/AppLoader';

export default function CompanyGroupLayout() {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const companyToken = await AsyncStorage.getItem('companyToken');
        if (cancelled) return;
        if (!companyToken) {
          router.replace('/company/login');
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [segments]);

  if (checking) {
    return <AppLoader message="Authenticating session..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </View>
  );
}
