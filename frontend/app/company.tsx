// frontend/app/company.tsx
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function CompanyEntry() {
  const theme = useTheme();
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/company/dashboard');
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator animating color={(theme as any).colors.info} />
    </View>
  );
}
