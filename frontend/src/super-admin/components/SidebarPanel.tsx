import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import {
  Text,
  IconButton,
  useTheme,
  MD3Theme,
  Menu,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useThemeMode } from '@theme';
import { useDrawer } from '../context/DrawerContext';
import { RAIL_WIDTH } from './SidebarRail';
import type { NavSection } from '@super-admin/sidebarNavItems';
import { getIconColor } from '@super-admin/sidebarNavItems';

export const PANEL_WIDTH = 256;

type Props = {
  currentRoute: string;
  navSections: NavSection[];
  headerTitle: string;
  headerIcon: string;
  headerSubtitle?: string;
  onLogout: () => void;
  animatedMode?: boolean;
  collapsed?: boolean;
};

export default function SidebarPanel({
  currentRoute,
  navSections,
  headerTitle,
  headerIcon,
  headerSubtitle = '',
  onLogout,
  animatedMode = false,
  collapsed = false,
}: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { mode, setMode } = useThemeMode();
  const { toggleDrawer } = useDrawer();
  const router = useRouter();
  const [themeMenuVisible, setThemeMenuVisible] = useState(false);

  const sidebarAnim = useRef(new Animated.Value(animatedMode && collapsed ? 0 : 1)).current;

  useEffect(() => {
    if (animatedMode) {
      Animated.timing(sidebarAnim, {
        toValue: collapsed ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      sidebarAnim.setValue(1);
    }
  }, [collapsed, animatedMode, sidebarAnim]);

  const animWidth = animatedMode
    ? sidebarAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [RAIL_WIDTH, PANEL_WIDTH],
      })
    : PANEL_WIDTH;

  const railActive = animatedMode && collapsed;

  const navigateTo = (path: string) => {
    if (currentRoute !== path) {
      router.push(path as any);
    }
  };

  const themeLabel = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';
  const themeIcon = mode === 'light' ? 'white-balance-sunny' : mode === 'dark' ? 'weather-night' : 'theme-light-dark';

  return (
    <Animated.View style={[styles.container, { width: animWidth }]}>
      <View style={[styles.header, railActive && styles.headerRail]}>
        <View style={[styles.headerLeft, railActive && styles.headerLeftRail]}>
          <Pressable onPress={toggleDrawer} hitSlop={8} accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name={headerIcon as any} size={20} color={theme.colors.onPrimary} />
            </View>
          </Pressable>
          {!railActive && (
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              {headerSubtitle ? <Text style={styles.headerSubtitle}>{headerSubtitle}</Text> : null}
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {navSections.map((section) => (
          <View key={section.title}>
            {!railActive && <Text style={styles.sectionHeader}>{section.title}</Text>}
            {section.items.map((item) => {
              const isActive = currentRoute === item.path;
              return (
                <Pressable
                  key={item.path}
                  onPress={() => navigateTo(item.path)}
                  style={({ pressed }) => [
                    styles.navItem,
                    railActive && styles.navItemRail,
                    isActive && (railActive ? styles.navItemRailActive : styles.navItemActive),
                    pressed && !isActive && styles.navItemPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={18}
                    color={isActive ? theme.colors.onPrimary : getIconColor(item.colorKey, theme.dark)}
                  />
                  {!railActive && (
                    <Text
                      style={[
                        styles.navLabel,
                        isActive && styles.navLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            {!railActive && <View style={styles.divider} />}
          </View>
        ))}

        <View style={styles.footerSection}>
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              railActive && styles.logoutBtnRail,
              pressed && styles.logoutBtnPressed,
            ]}
          >
            <MaterialCommunityIcons name="logout" size={16} color={theme.colors.secondary} style={{ opacity: 0.7 }} />
            {!railActive && <Text style={styles.logoutLabel}>Logout</Text>}
          </Pressable>

          <View style={styles.themeCard}>
            <Menu
              visible={themeMenuVisible}
              onDismiss={() => setThemeMenuVisible(false)}
              anchor={
                <Pressable onPress={() => setThemeMenuVisible(true)}>
                  <View style={styles.themeIconWrap}>
                    <MaterialCommunityIcons
                      name={themeIcon}
                      size={16}
                      color={mode === 'light' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                  </View>
                </Pressable>
              }
            >
              <Menu.Item
                leadingIcon="white-balance-sunny"
                onPress={() => { setMode('light'); setThemeMenuVisible(false); }}
                title="Light"
              />
              <Menu.Item
                leadingIcon="weather-night"
                onPress={() => { setMode('dark'); setThemeMenuVisible(false); }}
                title="Dark"
              />
              <Menu.Item
                leadingIcon="theme-light-dark"
                onPress={() => { setMode('system'); setThemeMenuVisible(false); }}
                title="System"
              />
            </Menu>
            {!railActive && (
              <Text style={styles.versionText}>
                v{Constants.expoConfig?.version || '1.0.0'}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.elevation.level2,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    headerRail: {
      justifyContent: 'center',
      padding: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flexShrink: 1,
      gap: 12,
    },
    headerLeftRail: {
      gap: 0,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextCol: {
      flexDirection: 'column',
      flexShrink: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.primary,
      lineHeight: 24,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: theme.colors.outline,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginTop: 8,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 2,
      gap: 12,
    },
    navItemRail: {
      justifyContent: 'center',
      paddingHorizontal: 0,
      minHeight: 44,
      gap: 0,
    },
    navItemActive: {
      backgroundColor: theme.colors.primary,
    },
    navItemRailActive: {
      backgroundColor: theme.colors.primary,
    },
    navItemPressed: {
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    navLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
    },
    navLabelActive: {
      fontWeight: '700',
      color: theme.colors.onPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginVertical: 10,
    },
    footerSection: {
      paddingTop: 8,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    logoutBtnRail: {
      justifyContent: 'center',
      paddingHorizontal: 0,
      gap: 0,
    },
    logoutBtnPressed: {
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    logoutLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.secondary,
    },
    themeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.elevation.level1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: 2,
      paddingLeft: 6,
      justifyContent: 'center',
    },
    themeIconWrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    versionText: {
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.5,
      marginLeft: 8,
    },
  });
