// frontend/src/super-admin/components/TopAppBar.tsx

import React from "react";
import { StyleSheet } from "react-native";
import { Appbar, useTheme } from "react-native-paper";
// import from expo/vector-icons
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

type Props = {
  title: string;
  showMenu?: boolean;
  showBack?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
};

export default function TopAppBar({
  title,
  showMenu = false,
  showBack = false,
  onMenuPress,
  onBackPress,
}: Props) {
  const theme = useTheme();

  return (
    <Appbar.Header
      style={[styles.header, { backgroundColor: theme.colors.primary }]}
    >
      {showMenu && (
        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialCommunityIcons name="menu" size={size} color={color} />
          )}
          onPress={onMenuPress}
        />
      )}
      {showBack && (
        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="arrow-left"
              size={size}
              color={color}
            />
          )}
          onPress={onBackPress}
        />
      )}
      <Appbar.Content
        title={title}
        titleStyle={[styles.title, { color: theme.colors.onPrimary }]}
        style={styles.content}
      />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    elevation: 4,
    position: "relative",
  },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "500",
    textAlign: "center",
  },
});
