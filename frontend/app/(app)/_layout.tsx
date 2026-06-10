import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";
import { useTheme } from "react-native-paper";
import AppLoader from "@components/AppLoader";
import { DrawerProvider, useDrawer } from "../../src/super-admin/context/DrawerContext";
import SidebarDrawer from "../../src/super-admin/components/SidebarDrawer";
import FloatingAssistantMenu from "../../src/super-admin/components/FloatingAssistantMenu";

function AppContent() {
  const theme = useTheme();
  const segments = useSegments();
  const { open, closeDrawer } = useDrawer();

  const isSuperAdmin = segments.includes("super-admin");
  const currentRoute = "/" + segments.filter((s) => s !== "(app)").join("/");

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      {isSuperAdmin && (
        <>
          <SidebarDrawer
            open={open}
            onClose={closeDrawer}
            currentRoute={currentRoute}
          />
          <FloatingAssistantMenu />
        </>
      )}
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
        // Company routes have their own auth check in company/_layout.tsx
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
      <AppContent />
    </DrawerProvider>
  );
}
