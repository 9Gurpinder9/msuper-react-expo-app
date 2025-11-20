// frontend/src/super-admin/components/TopAppBar.tsx

import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar, Menu, useTheme } from 'react-native-paper';
// import from expo/vector-icons
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeMode } from '@theme';

type Props = {
  title: string;
  showMenu?: boolean;
  showBack?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
};

export default function TopAppBar({
  title,
  showMenu = false,
  showBack = false,
  onMenuPress,
  onBackPress,
}: Props) {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const [menuVisible, setMenuVisible] = React.useState(false);

  const currentIconName =
    mode === 'light'
      ? 'white-balance-sunny'
      : mode === 'dark'
        ? 'weather-night'
        : 'theme-light-dark';

  return (
    <Appbar.Header
      mode="center-aligned"
      style={[styles.header, { backgroundColor: theme.colors.primary }]}
    >
      {showMenu && (
        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialCommunityIcons name="menu" size={size} color={color} />
          )}
          color={theme.colors.onPrimary}
          onPress={onMenuPress}
        />
      )}
      {showBack && (
        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialCommunityIcons name="arrow-left" size={size} color={color} />
          )}
          color={theme.colors.onPrimary}
          onPress={onBackPress}
        />
      )}
      <Appbar.Content
        title={title}
        titleStyle={[styles.title, { color: theme.colors.onPrimary }]}
      />
      {/* Theme mode menu moved to right side */}
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Appbar.Action
            accessibilityLabel="Theme mode"
            icon={({ size, color }) => (
              <MaterialCommunityIcons name={currentIconName as any} size={size} color={color} />
            )}
            color={theme.colors.onPrimary}
            onPress={() => setMenuVisible(true)}
          />
        }
      >
        <Menu.Item
          onPress={async () => {
            await setMode('light');
            setMenuVisible(false);
          }}
          title="Light"
          leadingIcon={(props) => (
            <MaterialCommunityIcons
              name="white-balance-sunny"
              size={props.size}
              color={props.color}
            />
          )}
          trailingIcon={
            mode === 'light'
              ? (props) => (
                  <MaterialCommunityIcons name="check" size={props.size} color={props.color} />
                )
              : undefined
          }
        />
        <Menu.Item
          onPress={async () => {
            await setMode('dark');
            setMenuVisible(false);
          }}
          title="Dark"
          leadingIcon={(props) => (
            <MaterialCommunityIcons name="weather-night" size={props.size} color={props.color} />
          )}
          trailingIcon={
            mode === 'dark'
              ? (props) => (
                  <MaterialCommunityIcons name="check" size={props.size} color={props.color} />
                )
              : undefined
          }
        />
        <Menu.Item
          onPress={async () => {
            await setMode('system');
            setMenuVisible(false);
          }}
          title="System Default"
          leadingIcon={(props) => (
            <MaterialCommunityIcons name="theme-light-dark" size={props.size} color={props.color} />
          )}
          trailingIcon={
            mode === 'system'
              ? (props) => (
                  <MaterialCommunityIcons name="check" size={props.size} color={props.color} />
                )
              : undefined
          }
        />
      </Menu>
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    elevation: 4,
    position: 'relative',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
});
