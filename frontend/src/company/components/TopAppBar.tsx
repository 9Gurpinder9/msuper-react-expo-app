import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Appbar, useTheme, Menu, Divider, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '@utils/toast';

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
  const router = useRouter();
  const pathname = usePathname();
  const { showSuccess } = useToast();
  const showMenu = false; // Disable hamburger menu in top app bar

  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = async () => {
    setMenuVisible(false);
    try {
      await AsyncStorage.multiRemove(['companyToken', 'companyEmail', 'company_permissions_cache']);
      showSuccess('Logged out');
      router.replace('/company/login');
    } catch {}
  };

  const isDashboard = pathname === '/company/dashboard';

  return (
    <Appbar.Header
      mode="small"
      style={{
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.dark ? '#334155' : '#94A3B8',
      }}
    >
      {showMenu && (
        <Appbar.Action
          icon="menu"
          color={theme.colors.primary}
          onPress={() => {}}
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
        {isDashboard ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Pressable
                onPress={() => setMenuVisible(true)}
                style={({ pressed }) => [
                  styles.actionIcon,
                  pressed && { opacity: 0.75 },
                  { flexDirection: 'row', alignItems: 'center', gap: 4 }
                ]}
              >
                <MaterialCommunityIcons
                  name="account-circle"
                  size={28}
                  color={theme.colors.primary}
                />
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={14}
                  color={theme.colors.primary}
                />
              </Pressable>
            }
            contentStyle={styles.dropdownContent}
          >
            <Menu.Item
              leadingIcon="office-building-outline"
              title="Company Profile"
              onPress={() => {
                setMenuVisible(false);
                router.push('/company/profile');
              }}
            />
            <Divider style={{ marginVertical: 4 }} />
            <Menu.Item
              leadingIcon="logout"
              title="Logout"
              titleStyle={{ color: theme.colors.error }}
              onPress={handleLogout}
            />
          </Menu>
        ) : (
          <IconButton
            icon="home-outline"
            iconColor={theme.colors.primary}
            size={24}
            onPress={() => router.push('/company/dashboard')}
            accessibilityLabel="Go to Dashboard"
            style={{ margin: 0 }}
          />
        )}
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
  dropdownContent: {
    borderRadius: 12,
    marginTop: 36,
  },
});
