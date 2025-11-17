// frontend/src/components/StatusBadge.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Status = 'success' | 'error' | 'warning' | 'info';

export default function StatusBadge({
  status,
  label,
  dense = true,
}: {
  status: Status;
  label: string;
  dense?: boolean;
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
      ? 'check'
      : status === 'warning'
      ? 'alert'
      : status === 'info'
      ? 'information-outline'
      : 'alert-circle-outline';

  return (
    <Chip
      compact={dense}
      mode="flat"
      icon={({ size, color }) => (
        <MaterialCommunityIcons name={iconName as any} size={size} color={fg} />
      )}
      style={[styles.chip, { backgroundColor: bg }]}
      textStyle={[styles.text, { color: fg }]}
    >
      {label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 28,
  },
  text: {
    fontSize: 12,
  },
});

