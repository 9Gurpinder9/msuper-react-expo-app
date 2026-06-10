import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";
import { useTheme } from "react-native-paper";
import AppLoader from "@components/AppLoader";

export default function AuthGroupLayout() {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const isCompanyRoute = segments.includes("company");
        if (isCompanyRoute) {
          const companyToken = await AsyncStorage.getItem("companyToken");
          if (cancelled) return;
          if (companyToken) {
            router.replace("/company/dashboard");
            return;
          }
        } else {
          const token = await AsyncStorage.getItem("authToken");
          if (cancelled) return;
          if (token) {
            router.replace("/super-admin/dashboard");
            return;
          }
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
    return <AppLoader message="Securing connection..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
  );
}

