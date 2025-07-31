import React from "react";
import { useColorScheme } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";

import { getTheme } from "@theme";
import createSuperAdminStack from "./navigation";

export default function SuperAdminApp() {
  const scheme = useColorScheme() as "light" | "dark";
  const theme = getTheme(scheme);

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={theme as any}>
        {createSuperAdminStack()}
      </NavigationContainer>
    </PaperProvider>
  );
}
