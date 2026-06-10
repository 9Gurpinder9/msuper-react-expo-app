import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';

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
