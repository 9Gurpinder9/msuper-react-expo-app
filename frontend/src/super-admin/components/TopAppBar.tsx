// frontend/src/super-admin/components/TopAppBar.tsx

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Menu, Text, useTheme } from 'react-native-paper';
// import from expo/vector-icons
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeMode } from '@theme';

type Props = {
  title: string;
  showMenu?: boolean;
  showBack?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  actions?: React.ReactNode;
};

export default function TopAppBar({
  title,
  showMenu = false,
  showBack = false,
  onMenuPress,
  onBackPress,
  actions,
}: Props) {
  const theme = useTheme();
  return (
    <Appbar.Header
      mode="small"
      style={{ backgroundColor: theme.colors.primary }}
    >
      {showBack && (
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={onBackPress}
        />
      )}
      {showMenu && (
        <Appbar.Action
          icon="menu"
          color={theme.colors.onPrimary}
          onPress={onMenuPress}
        />
      )}
      <Appbar.Content
        title={title}
        color={theme.colors.onPrimary}
        titleStyle={styles.title}
      />
      {actions}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});
