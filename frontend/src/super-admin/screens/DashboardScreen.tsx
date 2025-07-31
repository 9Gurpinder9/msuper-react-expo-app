import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation, DrawerActions } from "@react-navigation/native";

import TopAppBar from "../components/TopAppBar";

export default function DashboardScreen() {
  const navigation = useNavigation();

  const openDrawer = () => {
    // If you configure a DrawerNavigator above your stack, this will open it
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.container}>
      <TopAppBar title="Dashboard" showMenu onMenuPress={openDrawer} />

      <View style={styles.content}>
        <Text variant="bodyLarge">Welcome to your dashboard!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});
