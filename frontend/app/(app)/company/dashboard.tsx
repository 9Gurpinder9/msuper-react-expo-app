// frontend/app/(app)/company/dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import {
  Text,
  useTheme,
  MD3Theme,
  Card,
  Button,
  Surface,
  IconButton,
  Tooltip,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
import { useThemeMode } from '@theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TopAppBar from '@company/components/TopAppBar';
import { useToast } from '@utils/toast';


type Widget = {
  key: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  to?: string;
  category: 'workspace';
};

export default function CompanyDashboard() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const styles = makeStyles(theme);
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = '/' + segments.join('/');
  const { width } = useWindowDimensions();
  const { showSuccess } = useToast();
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(0)).current; // 0..1 interpolation
  const drawerWidth = Math.min(320, Math.max(260, Math.floor(width * 0.75)));

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: drawerOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [drawerOpen, drawerX]);

  const widgets: Widget[] = useMemo(
    () => [
      {
        key: 'bookmarks',
        title: 'Bookmarks',
        subtitle: 'Your saved links and collections',
        icon: 'bookmark-multiple-outline',
        color: theme.colors.primary,
        to: '/company/bookmarks',
        category: 'workspace',
      },
      {
        key: 'categories',
        title: 'Categories',
        subtitle: 'Manage bookmark categories',
        icon: 'shape-outline',
        color: theme.colors.secondary,
        to: '/company/categories',
        category: 'workspace',
      },
    ],
    [theme.colors.primary, theme.colors.secondary]
  );
  const workspaceWidgets = useMemo(() => widgets.filter((w) => w.category === 'workspace'), [widgets]);

  const renderDrawerButton = (label: string, iconName: string, path: string, colorKey: string) => {
    const isActive = currentRoute === path;
    const iconColor = getIconColor(colorKey, theme.dark);
    return (
      <Button
        mode="text"
        onPress={() => {
          setDrawerOpen(false);
          if (currentRoute !== path) router.push(path as any);
        }}
        icon={(p) => (
          <MaterialCommunityIcons
            name={iconName as any}
            size={p.size}
            color={isActive ? theme.colors.primary : iconColor}
          />
        )}
        contentStyle={{ justifyContent: 'flex-start', height: 40 }}
        textColor={isActive ? theme.colors.primary : theme.colors.onSurface}
        labelStyle={{ fontWeight: isActive ? '700' : '500' as any }}
        style={[styles.drawerItem, isActive && { backgroundColor: theme.colors.primaryContainer }]}
      >
        {label}
      </Button>
    );
  };

  const renderCategorySection = (title: string, items: Widget[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{items.length}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {items.map((w) => {
            const isHovered = hoverKey === w.key;
            return (
              <Pressable
                key={w.key}
                onHoverIn={() => setHoverKey(w.key)}
                onHoverOut={() => setHoverKey((k) => (k === w.key ? null : k))}
                style={styles.gridItem}
                onPress={() => w.to && router.push(w.to)}
              >
                <Card
                  mode="outlined"
                  style={[styles.widget, isHovered && styles.widgetHover]}
                >
                  <Card.Content style={styles.widgetContent}>
                    {isHovered && <View style={styles.hoverIndicator} />}
                    <View style={styles.widgetMeta}>
                      <View style={styles.widgetHeaderRow}>
                        <MaterialCommunityIcons
                          name={w.icon as any}
                          size={22}
                          color={isHovered ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        />
                        <Text style={styles.widgetTitle}>{w.title}</Text>
                      </View>
                      {!!w.subtitle && (
                        <Text style={styles.widgetSubtitle}>{w.subtitle}</Text>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </Card.Content>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const tx = drawerX.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] });
  const overlayOpacity = drawerX.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Company Dashboard" showMenu onMenuPress={() => setDrawerOpen(true)} />

      {drawerOpen && (
        <Pressable
          style={styles.overlayHitArea}
          pointerEvents="auto"
          onPress={() => setDrawerOpen(false)}
          accessibilityLabel="Close drawer by clicking outside"
        >
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </Pressable>
      )}
      <Animated.View
        style={[styles.drawer, { width: drawerWidth, transform: [{ translateX: tx }] }]}
      >
        <Surface elevation={0} style={StyleSheet.absoluteFill}>
          <View style={styles.drawerHeader}>
            <View style={styles.drawerHeaderLeft}>
              <MaterialCommunityIcons
                name="shield-account"
                size={22}
                color={theme.colors.onSurface}
              />
              <Text variant="titleMedium" style={styles.headerTitle}>
                Company Workspace
              </Text>
            </View>
            <IconButton
              icon={(p) => <MaterialCommunityIcons name="close" size={p.size} color={p.color} />}
              size={20}
              onPress={() => setDrawerOpen(false)}
              accessibilityLabel="Close menu"
            />
          </View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text variant="labelSmall" style={styles.drawerSectionHeader}>
              NAVIGATION
            </Text>
            {renderDrawerButton('Bookmarks', 'bookmark-multiple-outline', '/company/bookmarks', 'bookmarks')}
            {renderDrawerButton('Categories', 'shape-outline', '/company/categories', 'categories')}

            <View style={styles.drawerDivider} />

            {/* Footer: logout + theme */}
            <View style={styles.footerRow}>
              <Button
                mode="text"
                onPress={async () => {
                  setDrawerOpen(false);
                  await AsyncStorage.multiRemove(['companyToken', 'companyEmail']);
                  showSuccess('Logged out');
                  router.replace('/company/login');
                }}
                icon={(p) => (
                  <MaterialCommunityIcons name="logout" size={16} color={theme.colors.error} style={{ opacity: 0.65 }} />
                )}
                contentStyle={styles.minimalButtonContent}
                textColor={theme.colors.error}
                labelStyle={styles.minimalButtonLabel}
                style={styles.minimalLogoutBtn}
              >
                Logout
              </Button>

              <View style={styles.themeRow}>
                <Tooltip title="Light Mode">
                  <IconButton
                    icon="white-balance-sunny"
                    size={16}
                    onPress={() => setMode('light')}
                    iconColor={mode === 'light' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={[styles.themeBtn, mode === 'light' && styles.themeBtnActive]}
                  />
                </Tooltip>
                <Tooltip title="Dark Mode">
                  <IconButton
                    icon="weather-night"
                    size={16}
                    onPress={() => setMode('dark')}
                    iconColor={mode === 'dark' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={[styles.themeBtn, mode === 'dark' && styles.themeBtnActive]}
                  />
                </Tooltip>
                <Tooltip title="Auto / System Mode">
                  <IconButton
                    icon="theme-light-dark"
                    size={16}
                    onPress={() => setMode('system')}
                    iconColor={mode === 'system' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={[styles.themeBtn, mode === 'system' && styles.themeBtnActive]}
                  />
                </Tooltip>
              </View>
            </View>

            <Text variant="bodySmall" style={styles.versionText}>
              App Version: {Constants.expoConfig?.version || '1.0.0'}
            </Text>
          </ScrollView>
        </Surface>
      </Animated.View>

      <ScrollView style={styles.container} contentContainerStyle={styles.dashboardContent}>
        <Text style={styles.welcomeText}>
          Company Control Panel
        </Text>
        {renderCategorySection('Workspace', workspaceWidgets)}
      </ScrollView>
    </View>
  );
}

const getIconColor = (key: string, isDark: boolean) => {
  const colors: Record<string, { light: string; dark: string }> = {
    bookmarks: { light: '#4F46E5', dark: '#818CF8' },
    categories: { light: '#A21CAF', dark: '#E879F9' },
    logout: { light: '#DC2626', dark: '#F87171' },
  };
  const pair = colors[key] || { light: '#64748B', dark: '#94A3B8' };
  return isDark ? pair.dark : pair.light;
};

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
    },
    dashboardContent: {
      padding: 20,
      gap: 20,
    },
    welcomeText: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.onBackground,
      letterSpacing: -0.3,
    },
    sectionContainer: {
      gap: 12,
      marginTop: 8,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    badgeCount: {
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeCountText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    gridItem: {
      width: '100%',
      maxWidth: 360,
    },
    widget: {
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderWidth: 1,
      overflow: 'hidden',
    },
    widgetHover: {
      borderColor: theme.colors.primary,
    },
    widgetContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      position: 'relative',
    },
    hoverIndicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: theme.colors.primary,
    },
    widgetMeta: {
      flex: 1,
      gap: 4,
      paddingLeft: 4,
    },
    widgetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    widgetTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.onSurface,
    },
    widgetSubtitle: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.8,
    },
    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.colors.surface,
      zIndex: 1000,
      elevation: 4,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
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
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    drawerHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    headerTitle: {
      marginLeft: 8,
      fontWeight: '700',
      color: theme.colors.onSurface,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    drawerSectionHeader: {
      marginHorizontal: 8,
      marginTop: 12,
      marginBottom: 6,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    drawerItem: {
      borderRadius: 6,
      backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderBottomWidth: 1,
      borderBottomColor: theme.dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      marginBottom: 4,
    },
    drawerDivider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginVertical: 10,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      marginTop: 4,
      marginBottom: 12,
    },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderRadius: 20,
      padding: 2,
    },
    themeBtn: {
      margin: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    themeBtnActive: {
      backgroundColor: theme.colors.surfaceVariant,
      elevation: 1,
    },
    minimalLogoutBtn: {
      borderRadius: 6,
      opacity: 0.8,
      margin: 0,
    },
    minimalButtonContent: {
      height: 36,
      justifyContent: 'flex-start',
    },
    minimalButtonLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    versionText: {
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
      opacity: 0.6,
      paddingBottom: 16,
    },
  });
