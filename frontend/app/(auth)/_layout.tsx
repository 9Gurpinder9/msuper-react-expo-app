import React from "react";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";
import { useTheme } from "react-native-paper";
import AppLoader from "@super-admin/components/AppLoader";

export default function AuthGroupLayout() {
  const theme = useTheme();
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (cancelled) return;
        if (token) {
          router.replace("/super-admin/dashboard");
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return <AppLoader message="Securing connection..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
  );
}

