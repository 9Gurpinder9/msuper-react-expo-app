import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLoader from '@components/AppLoader';
import { DrawerProvider, useDrawer } from '../../../src/super-admin/context/DrawerContext';
import CompanySidebarLayout from '@company/components/CompanySidebarLayout';
import FloatingAssistantMenu from '../../../src/super-admin/components/FloatingAssistantMenu';
import { useCompanyNavItems } from '../../../src/company/hooks/useCompanyNavItems';
import { useToast } from '@utils/toast';

function CompanyAppContent() {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { showSuccess } = useToast();
  const { mode } = useDrawer();
  const currentRoute = '/' + segments.filter((s) => s !== '(app)').join('/');
  const { navSections } = useCompanyNavItems();

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['companyToken', 'companyEmail', 'company_permissions_cache']);
      showSuccess('Logged out');
      router.replace('/company/login');
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CompanySidebarLayout
        navSections={navSections}
        headerTitle="Control Panel"
        headerIcon="view-grid"
        headerSubtitle="Enterprise Admin"
        currentRoute={currentRoute}
        onLogout={handleLogout}
        animatedMode
        floatCollapseButton
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      </CompanySidebarLayout>
      {mode === 'overlay' && <FloatingAssistantMenu />}
    </View>
  );
}

export default function CompanyGroupLayout() {
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
    <DrawerProvider>
      <CompanyAppContent />
    </DrawerProvider>
  );
}
