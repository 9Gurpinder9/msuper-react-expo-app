import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { useDrawer } from '../context/DrawerContext';

type Props = {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  actions?: React.ReactNode;
};

export default function TopAppBar({
  title,
  showBack = false,
  onBackPress,
  actions,
}: Props) {
  const theme = useTheme();
  const showMenu = false; // Disable hamburger menu in top app bar

  return (
    <Appbar.Header
      mode="small"
      style={{
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.dark ? '#334155' : '#94A3B8',
      }}
    >
      {showMenu && (
        <Appbar.Action
          icon="menu"
          color={theme.colors.primary}
          onPress={toggleDrawer}
        />
      )}
      {showBack && (
        <Appbar.BackAction
          color={theme.colors.primary}
          onPress={onBackPress}
        />
      )}
      <Appbar.Content
        title={title}
        color={theme.colors.primary}
        titleStyle={styles.title}
      />
      {actions}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
