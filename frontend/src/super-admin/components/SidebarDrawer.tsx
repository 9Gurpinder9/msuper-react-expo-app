// frontend/src/super-admin/components/SidebarDrawer.tsx

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import {
  Text,
  Button,
  IconButton,
  Surface,
  SegmentedButtons,
  useTheme,
  MD3Theme,
  Tooltip,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useThemeMode } from '@theme';
import { useToast } from '@utils/toast';

type Props = {
  open: boolean;
  onClose: () => void;
  currentRoute: string;
};

export default function SidebarDrawer({ open, onClose, currentRoute }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { mode, setMode } = useThemeMode();
  const router = useRouter();
  const { showSuccess } = useToast();
  const { width } = useWindowDimensions();

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

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      showSuccess('Logged out');
      router.replace('/super-admin/login');
    } catch {}
  };

  const navigateTo = (path: string) => {
    onClose();
    // Prevent navigating to the exact same screen to avoid double-pushes
    if (currentRoute !== path) {
      router.push(path as any);
    }
  };

  const renderDrawerButton = (
    label: string,
    iconName: string,
    path: string,
    colorKey: string
  ) => {
    const isActive = currentRoute === path;
    const iconColor = getIconColor(colorKey, theme.dark);

    // Styling logic for active vs normal
    const btnStyle = [
      styles.drawerItem,
      isActive && {
        backgroundColor: theme.colors.primaryContainer,
      },
    ];

    const labelStyle = {
      fontWeight: (isActive ? '700' : '500') as '700' | '500',
      color: isActive ? theme.colors.primary : theme.colors.onSurface,
    };

    return (
      <Button
        mode="text"
        onPress={() => navigateTo(path)}
        icon={(p) => (
          <MaterialCommunityIcons
            name={iconName as any}
            size={p.size}
            color={isActive ? theme.colors.primary : iconColor}
          />
        )}
        contentStyle={styles.drawerButtonContent}
        textColor={isActive ? theme.colors.primary : theme.colors.onSurface}
        labelStyle={labelStyle}
        style={btnStyle}
      >
        {label}
      </Button>
    );
  };

  return (
    <>
      {/* Drawer overlay (captures outside clicks) */}
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
          { width: drawerWidth, transform: [{ translateX: tx }] },
        ]}
      >
        <Surface elevation={0} style={StyleSheet.absoluteFill}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.drawerHeaderLeft}>
              <MaterialCommunityIcons
                name="shield-account"
                size={22}
                color={theme.colors.onSurface}
              />
              <Text variant="titleMedium" style={styles.headerTitle}>
                Management Console
              </Text>
            </View>
            <IconButton
              icon={(p) => <MaterialCommunityIcons name="close" size={p.size} color={p.color} />}
              size={20}
              onPress={onClose}
              accessibilityLabel="Close menu"
            />
          </View>

          {/* Scrollable Drawer Items */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* CORE NAVIGATION SECTION */}
            <Text variant="labelSmall" style={styles.drawerSectionHeader}>
              CORE NAVIGATION
            </Text>
            {renderDrawerButton('Home', 'home-outline', '/', 'home')}
            {renderDrawerButton('Dashboard', 'view-dashboard-outline', '/super-admin/dashboard', 'dashboard')}
            {renderDrawerButton('Companies', 'office-building-outline', '/super-admin/companies', 'companies')}
            {renderDrawerButton('Subscription Plans', 'card-bulleted-outline', '/super-admin/subscription-plans', 'subscription-plans')}
            {renderDrawerButton('App Modules', 'menu-open', '/super-admin/features', 'features')}
            {renderDrawerButton('User Roles', 'account-key-outline', '/super-admin/roles', 'roles')}
            {renderDrawerButton('Company Categories', 'shape-outline', '/super-admin/company-categories', 'company-categories')}

            <View style={styles.drawerDivider} />

            {/* ADMINISTRATIVE REGISTRIES SECTION */}
            <Text variant="labelSmall" style={styles.drawerSectionHeader}>
              ADMINISTRATIVE REGISTRIES
            </Text>
            {renderDrawerButton('Countries', 'earth', '/super-admin/countries', 'countries')}
            {renderDrawerButton('States', 'map-outline', '/super-admin/states', 'states')}
            {renderDrawerButton('Cities', 'city-variant-outline', '/super-admin/cities', 'cities')}

            <View style={styles.drawerDivider} />

            {/* TOOLS & DIAGNOSTICS SECTION */}
            <Text variant="labelSmall" style={styles.drawerSectionHeader}>
              TOOLS & DIAGNOSTICS
            </Text>
            {renderDrawerButton('Scan Bill', 'file-document-outline', '/super-admin/scan-bill', 'scan')}
            {renderDrawerButton('Online Scan Bill', 'cloud-search-outline', '/super-admin/online-scan-bill', 'online-scan')}
            {renderDrawerButton('System Diagnostics', 'pulse', '/super-admin/diagnostics', 'diagnostics')}

            <View style={styles.drawerDivider} />

            {/* SESSION & THEME SECTION (Muted & Minimal) */}
            <View style={styles.drawerDivider} />

            <View style={styles.footerRow}>
              <Button
                mode="text"
                onPress={() => {
                  onClose();
                  handleLogout();
                }}
                icon={(p) => (
                  <MaterialCommunityIcons
                    name="logout"
                    size={16}
                    color={theme.colors.error}
                    style={{ opacity: 0.65 }}
                  />
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
    </>
  );
}

const getIconColor = (key: string, isDark: boolean) => {
  const colors: Record<string, { light: string; dark: string }> = {
    home: { light: '#0EA5E9', dark: '#38BDF8' },
    dashboard: { light: '#4F46E5', dark: '#818CF8' }, // Indigo/Dashboard
    countries: { light: '#0F766E', dark: '#2DD4BF' },
    states: { light: '#1D4ED8', dark: '#60A5FA' },
    cities: { light: '#0369A1', dark: '#38BDF8' },
    'subscription-plans': { light: '#B45309', dark: '#FBBF24' },
    features: { light: '#6D28D9', dark: '#A78BFA' },
    roles: { light: '#BE185D', dark: '#F472B6' },
    'company-categories': { light: '#A21CAF', dark: '#E879F9' },
    companies: { light: '#2563EB', dark: '#60A5FA' },
    scan: { light: '#0D9488', dark: '#2DD4BF' },
    'online-scan': { light: '#EA580C', dark: '#FB923C' },
    diagnostics: { light: '#E11D48', dark: '#FB7185' },
    logout: { light: '#DC2626', dark: '#F87171' },
  };
  const pair = colors[key] || { light: '#64748B', dark: '#94A3B8' };
  return isDark ? pair.dark : pair.light;
};

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
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
    drawerButtonContent: {
      justifyContent: 'flex-start',
      height: 40,
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
    versionText: {
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
      opacity: 0.6,
      paddingBottom: 16,
    },
  });
