// frontend/App.tsx
import React from "react";
import Constants from "expo-constants";
import { useColorScheme } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";

import { getTheme } from "./src/theme";
import createSuperAdminStack from "./src/super-admin/navigation";
import CompanyApp from "./src/company/App";

export default function App() {
  // ① read the current OS color scheme
  const scheme = useColorScheme() ?? "light";

  // ② pick the matching MD3 theme
  const theme = getTheme(scheme);

  // ③ choose which navigator to render
  const variant = Constants.expoConfig?.extra?.appVariant;
  const Content =
    variant === "super-admin" ? createSuperAdminStack() : CompanyApp;

  // ④ one single PaperProvider + NavigationContainer
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={theme as any}>{Content}</NavigationContainer>
    </PaperProvider>
  );
}
