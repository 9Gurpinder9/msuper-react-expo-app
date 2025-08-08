// frontend/app/super-admin/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function SuperAdminLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
