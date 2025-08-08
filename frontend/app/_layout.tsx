// frontend/app/_layout.tsx
import React from "react";
import { Slot } from "expo-router";
import { useColorScheme } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { getTheme } from "@theme";
// NOTE: if your ToastProvider is a *default* export, drop the braces
import { ToastProvider } from "../src/utils/ToastProvider";

export default function RootLayout() {
  const scheme = useColorScheme() ?? "light";
  const theme = getTheme(scheme);

  return (
    <PaperProvider theme={theme}>
      <ToastProvider>
        <Slot />
      </ToastProvider>
    </PaperProvider>
  );
}
