import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import TopAppBar from '@company/components/TopAppBar';

export default function CompanyProfile() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TopAppBar title="Company Profile" />
      <View style={styles.container}>
        <Text style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
          Company Profile — coming soon
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    fontSize: 16,
  },
});
