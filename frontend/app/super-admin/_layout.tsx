// app/super-admin/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function SuperAdminLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.surfaceVariant },
      }}
    />
  );
}
