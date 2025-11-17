import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, MD3Theme } from "react-native-paper";
import TopAppBar from "@super-admin/components/TopAppBar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function StatesScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[theme.colors.primary, (theme as any).colors.surfaceVariant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <TopAppBar title="States" showBack onBackPress={() => router.back()} />
      <View style={styles.container}>
        <Text variant="titleLarge">States</Text>
        <Text>Coming soon: list/add/edit states.</Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1, padding: 16 },
  });

