import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, Platform } from 'react-native';
import {
  Text,
  IconButton,
  useTheme,
  MD3Theme,
  Tooltip,
  Menu,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useThemeMode } from '@theme';
import { useDrawer } from '../context/DrawerContext';
import { RAIL_WIDTH } from './SidebarRail';
import type { NavSection } from '@super-admin/sidebarNavItems';

export const PANEL_WIDTH = 256;

function ConditionalTooltip({ title, children }: { title: string; children: React.ReactElement }) {
  if (!title) return children;
  return (
    <Tooltip title={title}>
      {children}
    </Tooltip>
  );
}

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
  const [isHoveredScroll, setIsHoveredScroll] = useState(false);
  const styles = makeStyles(theme, isHoveredScroll);
  const { mode, setMode } = useThemeMode();
  const { toggleDrawer } = useDrawer();
  const router = useRouter();

  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

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

  const activeColor = theme.colors.primary;
  const inactiveColor = theme.dark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.65)';
  const borderColor = theme.dark ? '#334155' : '#94A3B8';

  return (
    <Animated.View style={[styles.container, { width: animWidth, borderRightColor: borderColor }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name={headerIcon as any} size={22} color={theme.colors.onPrimary} />
          </View>
          <Animated.View
            style={[
              styles.headerTextCol,
              {
                opacity: sidebarAnim,
                width: sidebarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 160],
                }),
              },
            ]}
          >
            <Text numberOfLines={1} style={styles.headerTitle}>{headerTitle}</Text>
            {headerSubtitle ? <Text numberOfLines={1} style={styles.headerSubtitle}>{headerSubtitle}</Text> : null}
          </Animated.View>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true} persistentScrollbar={false} onHoverIn={() => setIsHoveredScroll(true)} onHoverOut={() => setIsHoveredScroll(false)}>
        {navSections.map((section, si) => (
          <View key={section.title}>
            {si === 0 && <View style={styles.navTopGap} />}
            <Animated.View
              style={{
                opacity: sidebarAnim,
                height: sidebarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 24],
                }),
                overflow: 'hidden',
              }}
            >
              <Text numberOfLines={1} style={styles.sectionHeader}>{section.title}</Text>
            </Animated.View>
            {section.items.map((item) => {
              const isActive = currentRoute === item.path;
              const isHovered = hoveredPath === item.path;
              const itemColor = isActive ? activeColor : inactiveColor;
              const pressableContent = (
                <Pressable
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
                  <View style={styles.navIconWrapper}>
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={itemColor}
                    />
                  </View>
                  <Animated.View
                    style={[
                      styles.navLabelWrapper,
                      {
                        opacity: sidebarAnim,
                        width: sidebarAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 160],
                        }),
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.navLabel,
                        { color: itemColor },
                        isActive && styles.navLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Animated.View>
                </Pressable>
              );

              return (
                <ConditionalTooltip
                  title={collapsed ? item.label : ''}
                  key={`${item.path}-${hoveredPath === item.path}`}
                >
                  {pressableContent}
                </ConditionalTooltip>
              );
            })}
            <Animated.View
              style={{
                opacity: sidebarAnim,
                height: sidebarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 21],
                }),
                overflow: 'hidden',
              }}
            >
              {si < navSections.length - 1 && <View style={styles.dividerDark} />}
            </Animated.View>
          </View>
        ))}

        <View style={[styles.footerSection, { borderTopColor: borderColor }]}>
          <ConditionalTooltip title={collapsed ? 'Logout' : ''}>
            <Pressable
              onPress={onLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && styles.logoutBtnPressed,
              ]}
            >
              <View style={styles.navIconWrapper}>
                <MaterialCommunityIcons name="logout" size={18} color={theme.dark ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.7)'} />
              </View>
              <Animated.View
                style={[
                  styles.navLabelWrapper,
                  {
                    opacity: sidebarAnim,
                    width: sidebarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 160],
                    }),
                  },
                ]}
              >
                <Text numberOfLines={1} style={styles.logoutLabel}>Logout</Text>
              </Animated.View>
            </Pressable>
          </ConditionalTooltip>

          <View style={styles.themeCard}>
            <Menu
              visible={showThemeMenu}
              onDismiss={() => setShowThemeMenu(false)}
              anchor={
                <ConditionalTooltip title={collapsed ? `Theme: ${mode}` : ''}>
                  <Pressable
                    onPress={() => setShowThemeMenu(true)}
                    style={({ pressed }) => [
                      styles.themeBtn,
                      pressed && styles.themeBtnPressed,
                    ]}
                  >
                    <View style={styles.navIconWrapper}>
                      <MaterialCommunityIcons
                        name={
                          mode === 'light' ? 'white-balance-sunny' : mode === 'dark' ? 'weather-night' : 'theme-light-dark'
                        }
                        size={18}
                        color={theme.colors.primary}
                      />
                    </View>
                    <Animated.View
                      style={[
                        styles.navLabelWrapper,
                        {
                          opacity: sidebarAnim,
                          width: sidebarAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 160],
                          }),
                        },
                      ]}
                    >
                      <Text numberOfLines={1} style={[styles.themeLabel, { color: theme.colors.primary }]}>
                        {mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
                      </Text>
                    </Animated.View>
                  </Pressable>
                </ConditionalTooltip>
              }
            >
              <Menu.Item
                onPress={() => {
                  setMode('light');
                  setShowThemeMenu(false);
                }}
                title="Light"
                leadingIcon="white-balance-sunny"
              />
              <Menu.Item
                onPress={() => {
                  setMode('dark');
                  setShowThemeMenu(false);
                }}
                title="Dark"
                leadingIcon="weather-night"
              />
              <Menu.Item
                onPress={() => {
                  setMode('system');
                  setShowThemeMenu(false);
                }}
                title="System"
                leadingIcon="theme-light-dark"
              />
            </Menu>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const makeStyles = (theme: MD3Theme, isHoveredScroll: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRightWidth: 1,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerRail: {
      justifyContent: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    headerLeftRail: {
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
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
      marginLeft: 12,
      overflow: 'hidden',
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
      paddingHorizontal: 6,
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
      paddingLeft: 12,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44,
      borderRadius: 8,
      marginVertical: 4,
      paddingHorizontal: 12,
    },
    navIconWrapper: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navLabelWrapper: {
      marginLeft: 16,
      overflow: 'hidden',
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
      paddingHorizontal: 6,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44,
      borderRadius: 8,
      marginVertical: 4,
      paddingHorizontal: 12,
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
    themeCard: {
      backgroundColor: 'transparent',
    },
    themeBtnRail: {
      width: 44,
      height: 44,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      paddingHorizontal: 0,
      paddingVertical: 0,
      marginVertical: 4,
      gap: 0,
    },
    themeContainer: {
      flexDirection: 'column',
      alignItems: 'stretch',
      margin: 0,
      gap: 0,
    },
    themeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44,
      borderRadius: 8,
      marginVertical: 4,
      paddingHorizontal: 12,
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
    customTooltip: {
      position: 'absolute',
      left: 54,
      top: 10,
      backgroundColor: theme.dark ? '#1E293B' : '#F8FAFC',
      borderWidth: 1,
      borderColor: theme.dark ? '#334155' : '#CBD5E1',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      zIndex: 2000,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      ...Platform.select({
        web: {
          whiteSpace: 'nowrap',
        }
      } as any)
    },
    customTooltipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });
