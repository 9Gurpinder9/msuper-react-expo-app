import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';

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
  return (
    <Appbar.Header
      mode="small"
      style={{
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outlineVariant,
      }}
    >
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
