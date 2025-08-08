// frontend/app/super-admin/dashboard.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Text,
  ActivityIndicator,
  useTheme,
  MD3Theme,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useToast } from "@utils/toast";
import { API_BASE_URL } from "@config";

export default function Dashboard() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const res = await fetch(`${API_BASE_URL}/super-admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) {
          showToast(body.message || "Failed to load", "error");
        } else {
          setData(body.data);
        }
      } catch {
        showToast("Network error", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge">Welcome, Super-Admin!</Text>
      {/* …render your dashboard data… */}
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });
