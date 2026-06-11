import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";
import { useTheme } from "react-native-paper";
import AppLoader from "@components/AppLoader";
import { DrawerProvider, useDrawer } from "../../src/super-admin/context/DrawerContext";
import ResponsiveSidebarLayout from "@components/ResponsiveSidebarLayout";
import FloatingAssistantMenu from "../../src/super-admin/components/FloatingAssistantMenu";
import { SUPER_ADMIN_NAV_ITEMS } from "../../src/super-admin/sidebarNavItems";
import { useToast } from "@utils/toast";

function SuperAdminContent() {
  const theme = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const { showSuccess } = useToast();
  const { mode } = useDrawer();

  const isSuperAdmin = segments.includes("super-admin");
  const currentRoute = "/" + segments.filter((s) => s !== "(app)").join("/");

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      showSuccess("Logged out");
      router.replace("/super-admin/login");
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ResponsiveSidebarLayout
        showSidebar={isSuperAdmin}
        navSections={SUPER_ADMIN_NAV_ITEMS}
        headerTitle="Management Console"
        headerIcon="shield-account"
        headerSubtitle="Enterprise Admin"
        currentRoute={currentRoute}
        onLogout={handleLogout}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      </ResponsiveSidebarLayout>
      {isSuperAdmin && mode === "overlay" && <FloatingAssistantMenu />}
    </View>
  );
}

export default function AppGroupLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (segments.includes("company")) {
          if (!cancelled) setChecking(false);
          return;
        }
        const token = await AsyncStorage.getItem("authToken");
        if (cancelled) return;
        if (!token) {
          router.replace("/super-admin/login");
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
      <SuperAdminContent />
    </DrawerProvider>
  );
}
