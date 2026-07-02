import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  useWindowDimensions,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Text,
  IconButton,
  Surface,
  useTheme,
  MD3Theme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useThemeMode } from '@theme';
import type { NavSection } from '@super-admin/sidebarNavItems';

import { useDrawer } from '../context/DrawerContext';

type Props = {
  open: boolean;
  onClose: () => void;
  currentRoute: string;
  navSections: NavSection[];
  headerTitle: string;
  headerIcon: string;
  headerSubtitle?: string;
  onLogout: () => void;
};

export default function SidebarDrawer({ open, onClose, currentRoute, navSections, headerTitle, headerIcon, headerSubtitle = '', onLogout }: Props) {
  const theme = useTheme();
  const [isHoveredScroll, setIsHoveredScroll] = useState(false);
  const styles = makeStyles(theme, isHoveredScroll);
  const { mode, setMode } = useThemeMode();
  const { toggleDrawer } = useDrawer();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [hoveredToggle, setHoveredToggle] = useState(false);

  const drawerWidth = Math.min(320, Math.max(260, Math.floor(width * 0.75)));
  const drawerX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: open ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [open, drawerX]);

  const tx = drawerX.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const overlayOpacity = drawerX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  const navigateTo = (path: string) => {
    onClose();
    if (currentRoute !== path) {
      router.push(path as any);
    }
  };

  const activeColor = theme.colors.primary;
  const inactiveColor = theme.dark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.65)';
  const borderColor = theme.dark ? '#334155' : '#94A3B8';

  return (
    <>
      {open && (
        <Pressable
          style={styles.overlayHitArea}
          pointerEvents="auto"
          onPress={onClose}
          accessibilityLabel="Close drawer by clicking outside"
        >
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </Pressable>
      )}

      <Animated.View
        style={[
          styles.drawer,
          { width: drawerWidth, transform: [{ translateX: tx }], borderRightColor: borderColor },
        ]}
      >
        <Surface elevation={0} style={StyleSheet.absoluteFill}>
          <View style={styles.drawerHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name={headerIcon as any} size={22} color={theme.colors.onPrimary} />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                {headerSubtitle ? <Text style={styles.headerSubtitle}>{headerSubtitle}</Text> : null}
              </View>
            </View>
            <IconButton
              icon={(p) => <MaterialCommunityIcons name="close" size={p.size} color={p.color} />}
              size={20}
              onPress={onClose}
              accessibilityLabel="Close menu"
            />
          </View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={false}
            onHoverIn={() => setIsHoveredScroll(true)}
            onHoverOut={() => setIsHoveredScroll(false)}
          >
            {navSections.map((section, si) => (
              <View key={section.title}>
                {si === 0 && <View style={styles.navTopGap} />}
                <Text style={styles.sectionHeader}>{section.title}</Text>
                {section.items.map((item) => {
                  const isActive = currentRoute === item.path;
                  const isHovered = hoveredPath === item.path;
                  const itemColor = isActive ? activeColor : inactiveColor;
                  return (
                    <Pressable
                      key={item.path}
                      onPress={() => navigateTo(item.path)}
                      onHoverIn={() => setHoveredPath(item.path)}
                      onHoverOut={() => setHoveredPath((p) => (p === item.path ? null : p))}
                      style={({ pressed }) => [
                        styles.navItem,
                        isActive && styles.navItemActive,
                        isHovered && styles.navItemHovered,
                        pressed && !isActive && styles.navItemPressed,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={20}
                        color={itemColor}
                        style={styles.navIcon}
                      />
                      <Text
                        style={[
                          styles.navLabel,
                          { color: itemColor },
                          isActive && styles.navLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
                {si < navSections.length - 1 && <View style={styles.dividerDark} />}
              </View>
            ))}

            <View style={[styles.footerSection, { borderTopColor: borderColor }]}>
              <Pressable
                onPress={() => {
                  onClose();
                  onLogout();
                }}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  pressed && styles.logoutBtnPressed,
                ]}
              >
                <MaterialCommunityIcons name="logout" size={18} color={theme.dark ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.7)'} />
                <Text style={styles.logoutLabel}>Logout</Text>
              </Pressable>

              <View style={styles.themeContainer}>
                <Pressable
                  onPress={() => setShowThemeMenu(!showThemeMenu)}
                  style={({ pressed }) => [
                    styles.themeBtn,
                    pressed && styles.themeBtnPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      mode === 'light'
                        ? 'white-balance-sunny'
                        : mode === 'dark'
                        ? 'weather-night'
                        : 'theme-light-dark'
                    }
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.themeLabel, { color: theme.colors.primary }]}>
                    {mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
                  </Text>
                </Pressable>

                {showThemeMenu && (
                  <View style={[styles.themeDropdownIconOnly, { borderColor: borderColor }]}>
                    <Pressable
                      onPress={() => {
                        setMode('light');
                        setShowThemeMenu(false);
                      }}
                      style={[styles.dropdownItem, mode === 'light' && styles.dropdownItemActive]}
                    >
                      <MaterialCommunityIcons name="white-balance-sunny" size={16} color={mode === 'light' ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                      <Text style={[styles.dropdownLabel, mode === 'light' && styles.dropdownLabelActive]}>Light</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setMode('dark');
                        setShowThemeMenu(false);
                      }}
                      style={[styles.dropdownItem, mode === 'dark' && styles.dropdownItemActive]}
                    >
                      <MaterialCommunityIcons name="weather-night" size={16} color={mode === 'dark' ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                      <Text style={[styles.dropdownLabel, mode === 'dark' && styles.dropdownLabelActive]}>Dark</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setMode('system');
                        setShowThemeMenu(false);
                      }}
                      style={[styles.dropdownItem, mode === 'system' && styles.dropdownItemActive]}
                    >
                      <MaterialCommunityIcons name="theme-light-dark" size={16} color={mode === 'system' ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                      <Text style={[styles.dropdownLabel, mode === 'system' && styles.dropdownLabelActive]}>System</Text>
                    </Pressable>
                  </View>
                )}

                <Text style={styles.versionTextCent}>
                  Version: {Constants.expoConfig?.version || '1.0.0'}
                </Text>
              </View>
            </View>
          </ScrollView>
        </Surface>

        <Pressable
          onPress={toggleDrawer}
          onHoverIn={() => setHoveredToggle(true)}
          onHoverOut={() => setHoveredToggle(false)}
          style={[
            styles.floatingBtnZone,
            {
              left: drawerWidth - 14,
              top: (Constants.statusBarHeight || 0) + 56 - 25,
            },
          ]}
          accessibilityLabel={open ? 'Close drawer' : 'Open drawer'}
        >
          <View
            style={[
              styles.floatingBtn,
              {
                backgroundColor: theme.dark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.85)',
                borderColor: borderColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={open ? 'chevron-left' : 'chevron-right'}
              size={18}
              color={theme.colors.primary}
            />
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
}

const makeStyles = (theme: MD3Theme, isHoveredScroll: boolean) =>
  StyleSheet.create({
    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.colors.surfaceVariant,
      zIndex: 1000,
      elevation: 4,
      borderRightWidth: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      zIndex: 900,
    },
    overlayHitArea: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 900,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 0,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flexShrink: 1,
      gap: 12,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIconContainer: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextCol: {
      flexDirection: 'column',
      flexShrink: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.primary,
      lineHeight: 28,
    },
    headerSubtitle: {
      fontSize: 12,
      lineHeight: 16,
      color: theme.colors.onSurfaceVariant,
      marginTop: 1,
    },
    scrollContainer: {
      flex: 1,
      ...Platform.select({
        web: {
          scrollbarWidth: isHoveredScroll ? 'thin' : 'none',
          scrollbarColor: isHoveredScroll
            ? (theme.dark ? 'rgba(255,255,255,0.15) transparent' : 'rgba(15,23,42,0.1) transparent')
            : 'transparent transparent',
        }
      } as any)
    },
    scrollContent: {
      paddingTop: 8,
      paddingHorizontal: 16,
    },
    navTopGap: {
      height: 16,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: theme.dark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.45)',
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 16,
    },
    navItemActive: {
      backgroundColor: theme.dark ? 'rgba(129,140,248,0.08)' : 'rgba(0,70,255,0.04)',
    },
    navItemHovered: {
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
    },
    navItemPressed: {
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    navIcon: {
      width: 20,
      textAlign: 'center',
    },
    navLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    navLabelActive: {
      fontWeight: '700',
    },
    dividerDark: {
      height: 1,
      backgroundColor: theme.dark ? '#334155' : '#94A3B8',
      marginVertical: 10,
    },
    footerSection: {
      borderTopWidth: 1,
      paddingTop: 16,
      paddingBottom: 12,
      position: 'relative',
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 0,
      opacity: 0.8,
      ...Platform.select({
        web: {
          outlineStyle: 'none',
        } as any,
        default: {},
      }),
    },
    logoutBtnPressed: {
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    logoutLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.dark ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.7)',
    },
    themeContainer: {
      flexDirection: 'column',
      alignItems: 'stretch',
      marginTop: 0,
      gap: 0,
    },
    themeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 0,
      ...Platform.select({
        web: {
          outlineStyle: 'none',
        } as any,
        default: {},
      }),
    },
    themeBtnPressed: {
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    themeLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    themeDropdownIconOnly: {
      position: 'absolute',
      bottom: 45,
      left: 16,
      width: 140,
      backgroundColor: theme.colors.elevation.level3,
      borderRadius: 8,
      borderWidth: 1,
      overflow: 'hidden',
      paddingVertical: 4,
      zIndex: 1010,
      elevation: 5,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 10,
    },
    dropdownItemActive: {
      backgroundColor: theme.dark ? 'rgba(129,140,248,0.1)' : 'rgba(0,70,255,0.06)',
    },
    dropdownLabel: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    dropdownLabelActive: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
    versionTextCent: {
      fontSize: 11,
      lineHeight: 16,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.5,
      textAlign: 'center',
      marginTop: 6,
    },
    floatingBtnZone: {
      position: 'absolute',
      top: 120,
      width: 28,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
    },
    floatingBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
  });
