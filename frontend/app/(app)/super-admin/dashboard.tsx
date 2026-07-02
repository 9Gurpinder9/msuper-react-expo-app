import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable, useWindowDimensions, ScrollView, Platform } from 'react-native';
import {
  Text,
  ActivityIndicator,
  useTheme,
  MD3Theme,
  Card,
  Button,
  Surface,
  IconButton,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useThemeMode } from '@theme';
import { SegmentedButtons } from 'react-native-paper';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';

type Widget = {
  key: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string; // gradient start
  to?: string;
  category: 'core' | 'registries';
};

export default function Dashboard() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const authErrorShown = useRef(false);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const res = await fetch(`${API_BASE_URL}/super-admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            if (!cancelled && !authErrorShown.current) {
              authErrorShown.current = true;
              showError(body.message || 'Session expired. Please log in again.');
            }
            await AsyncStorage.removeItem('authToken');
            if (!cancelled) router.replace('/super-admin/login');
            return;
          }
          showError(body.message || 'Failed to load');
        } else {
          setData(body.data);
        }
      } catch {
        showError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const widgets: Widget[] = useMemo(
    () => [
      {
        key: 'companies',
        title: 'Companies',
        subtitle: 'Manage registered business organizations',
        icon: 'office-building-outline',
        color: theme.colors.secondary,
        to: '/super-admin/companies',
        category: 'core',
      },
      {
        key: 'subscription-plans',
        title: 'Subscription Plans',
        subtitle: 'Manage system pricing models',
        icon: 'card-bulleted-outline',
        color: theme.colors.primary,
        to: '/super-admin/subscription-plans',
        category: 'core',
      },
      {
        key: 'features',
        title: 'App Features',
        subtitle: 'Manage system module features menu',
        icon: 'menu-open',
        color: theme.colors.secondary,
        to: '/super-admin/features',
        category: 'core',
      },
      {
        key: 'roles',
        title: 'User Roles',
        subtitle: 'Manage system access roles',
        icon: 'account-key-outline',
        color: theme.colors.primary,
        to: '/super-admin/roles',
        category: 'core',
      },
    ],
    [theme.colors.primary, theme.colors.secondary]
  );

  const coreWidgets = useMemo(() => widgets.filter((w) => w.category === 'core'), [widgets]);
  const registryWidgets = useMemo(() => widgets.filter((w) => w.category === 'registries'), [widgets]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      showSuccess('Logged out');
      router.replace('/super-admin/login');
    } catch {}
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
                  style={[
                    styles.widget,
                    isHovered && styles.widgetHover,
                  ]}
                >
                  <Card.Content style={styles.widgetContent}>
                    <View style={styles.widgetMeta}>
                      <View style={styles.widgetHeaderRow}>
                        <MaterialCommunityIcons
                          name={w.icon as any}
                          size={22}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={styles.widgetTitle}>
                          {w.title}
                        </Text>
                      </View>
                      {!!w.subtitle && (
                        <Text style={styles.widgetSubtitle}>
                          {w.subtitle}
                        </Text>
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

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="System Console" />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {renderCategorySection('Core Management', coreWidgets)}
        {renderCategorySection('Administrative Registries', registryWidgets)}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 20,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
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
    diagnosticsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: 16,
      gap: 12,
    },
    diagnosticsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    diagnosticsTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    healthItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    healthLabel: {
      fontSize: 13,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    // Healthy (teal-like or green)
    badgeSuccess: {
      backgroundColor: theme.dark ? 'rgba(45, 212, 191, 0.1)' : '#CCFBF1',
    },
    dotSuccess: {
      backgroundColor: '#0D9488',
    },
    textSuccess: {
      color: '#0D9488',
    },
    // Down (red)
    badgeError: {
      backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
    },
    dotError: {
      backgroundColor: '#EF4444',
    },
    textError: {
      color: '#EF4444',
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
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderColor: theme.colors.outlineVariant,
      borderWidth: 1,
      overflow: 'hidden',
      // Web transitions
      ...(Platform.OS === 'web'
        ? ({
            transitionProperty: 'transform, box-shadow, border-color, shadow-opacity',
            transitionDuration: '300ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          } as any)
        : {}),
      // Base shadow
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    widgetHover: {
      transform: [{ scale: 1.02 }],
      borderColor: theme.colors.outlineVariant,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: theme.dark ? 0.35 : 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    widgetContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      position: 'relative',
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
  });
