import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDrawer } from '@super-admin/context/DrawerContext';

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
  const { mode, toggleDrawer } = useDrawer();

  const showMenu = mode === 'overlay';

  return (
    <Appbar.Header
      mode="small"
      style={{
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outlineVariant,
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
      <View style={styles.actionsRow}>
        <View style={styles.notificationWrapper}>
          <MaterialCommunityIcons
            name="bell-outline"
            size={22}
            color={theme.colors.primary}
          />
          <View style={[styles.notificationDot, { backgroundColor: theme.colors.error }]} />
        </View>
        <MaterialCommunityIcons
          name="cog-outline"
          size={22}
          color={theme.colors.primary}
          style={styles.actionIcon}
        />
        <MaterialCommunityIcons
          name="account-circle"
          size={28}
          color={theme.colors.primary}
        />
      </View>
      {actions}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationWrapper: {
    position: 'relative',
    padding: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionIcon: {
    padding: 4,
  },
});
