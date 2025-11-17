// frontend/src/components/StatusBanner.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Banner, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Status = 'success' | 'error' | 'warning' | 'info';

export default function StatusBanner({
  status,
  message,
  visible = true,
}: {
  status: Status;
  message: string;
  visible?: boolean;
}) {
  const theme = useTheme() as any;
  const bg =
    status === 'success'
      ? theme.colors.success
      : status === 'warning'
      ? theme.colors.warning
      : status === 'info'
      ? theme.colors.info
      : theme.colors.error;
  const fg =
    status === 'success'
      ? theme.colors.onSuccess
      : status === 'warning'
      ? theme.colors.onWarning
      : status === 'info'
      ? theme.colors.onInfo
      : theme.colors.onError;

  const iconName =
    status === 'success'
      ? 'check-circle'
      : status === 'warning'
      ? 'alert'
      : status === 'info'
      ? 'information'
      : 'alert-circle';

  return (
    <Banner
      visible={visible}
      icon={() => (
        <MaterialCommunityIcons name={iconName as any} size={18} color={fg} />
      )}
      style={[styles.banner, { backgroundColor: bg }]}
      contentStyle={styles.bannerContent}
      elevation={0}
    >
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
    </Banner>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 10,
    marginBottom: 8,
    minHeight: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  bannerContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
