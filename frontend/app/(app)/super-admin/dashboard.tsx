import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable, useWindowDimensions, ScrollView } from 'react-native';
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
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';

type Widget = {
  key: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string; // gradient start
  to?: string;
};

export default function Dashboard() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(0)).current; // 0..1 interpolation
  const authErrorShown = useRef(false);

  // Diagnostics states
  const [apiHealth, setApiHealth] = useState<'checking' | 'healthy' | 'down'>('checking');
  const [dbHealth, setDbHealth] = useState<'checking' | 'healthy' | 'down'>('checking');

  const drawerWidth = Math.min(320, Math.max(260, Math.floor(width * 0.75)));

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: drawerOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [drawerOpen, drawerX]);

  const fetchDiagnostics = async () => {
    // Check API Health
    try {
      const apiRes = await fetch(`${API_BASE_URL}/healthz`);
      if (apiRes.ok) {
        setApiHealth('healthy');
      } else {
        setApiHealth('down');
      }
    } catch {
      setApiHealth('down');
    }

    // Check Database Health
    try {
      const dbRes = await fetch(`${API_BASE_URL}/test-database`);
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDbHealth(dbData.connected && dbData.querySucceeded ? 'healthy' : 'down');
      } else {
        setDbHealth('down');
      }
    } catch {
      setDbHealth('down');
    }
  };

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
            if (!authErrorShown.current) {
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
          await fetchDiagnostics();
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
  }, [router, showError]);

  const widgets: Widget[] = useMemo(
    () => [
      {
        key: 'countries',
        title: 'Countries Registry',
        subtitle: 'Manage administrative countries',
        icon: 'earth',
        color: theme.colors.primary,
        to: '/super-admin/countries',
      },
      {
        key: 'states',
        title: 'States Registry',
        subtitle: 'Manage administrative states',
        icon: 'map-outline',
        color: theme.colors.primary,
        to: '/super-admin/states',
      },
      {
        key: 'cities',
        title: 'Cities Directory',
        subtitle: 'Manage municipalities and districts',
        icon: 'city-variant-outline',
        color: theme.colors.secondary,
        to: '/super-admin/cities',
      },
      {
        key: 'scan',
        title: 'Document Scanner',
        subtitle: 'Upload and process documents via OCR',
        icon: 'file-document-outline',
        color: theme.colors.primary,
        to: '/super-admin/scan-bill',
      },
      {
        key: 'online-scan',
        title: 'Online Bill Scan',
        subtitle: 'Advanced online scan & search integration',
        icon: 'cloud-search-outline',
        color: theme.colors.secondary,
        to: '/super-admin/online-scan-bill',
      },
    ],
    [theme.colors.primary, theme.colors.secondary]
  );

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      showSuccess('Logged out');
      router.replace('/super-admin/login');
    } catch {}
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating color={theme.colors.primary} />
      </View>
    );
  }

  const tx = drawerX.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] });
  const overlayOpacity = drawerX.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="System Console" showMenu onMenuPress={() => setDrawerOpen(true)} />

      {/* Drawer overlay (captures outside clicks) */}
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
              <Text variant="titleMedium" style={{ marginLeft: 8, fontWeight: '700' }}>
                Management Console
              </Text>
            </View>
            <IconButton
              icon={(p) => <MaterialCommunityIcons name="close" size={p.size} color={p.color} />}
              size={20}
              onPress={() => setDrawerOpen(false)}
              accessibilityLabel="Close menu"
            />
          </View>
          <View style={styles.drawerItems}>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/countries');
              }}
              icon="earth"
              contentStyle={{ justifyContent: 'flex-start' }}
              textColor={theme.colors.onSurface}
            >
              Countries Registry
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/states');
              }}
              icon="map-outline"
              contentStyle={{ justifyContent: 'flex-start' }}
              textColor={theme.colors.onSurface}
            >
              States Registry
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/cities');
              }}
              icon="city-variant-outline"
              contentStyle={{ justifyContent: 'flex-start' }}
              textColor={theme.colors.onSurface}
            >
              Cities Directory
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/scan-bill');
              }}
              icon="file-document-outline"
              contentStyle={{ justifyContent: 'flex-start' }}
              textColor={theme.colors.onSurface}
            >
              Scan Bill
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/online-scan-bill');
              }}
              icon="cloud-search-outline"
              contentStyle={{ justifyContent: 'flex-start' }}
              textColor={theme.colors.onSurface}
            >
              Online Scan Bill
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/diagnostics');
              }}
              icon="pulse"
              contentStyle={{ justifyContent: 'flex-start' }}
              textColor={theme.colors.onSurface}
            >
              System Diagnostics
            </Button>
            <View style={styles.drawerDivider} />
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                handleLogout();
              }}
              icon="logout"
              contentStyle={{ justifyContent: 'flex-start' }}
              textColor={theme.colors.error}
            >
              Logout Session
            </Button>
            <View style={styles.drawerDivider} />
            <Text variant="labelMedium" style={styles.drawerSectionHeader}>
              Theme Color Mode
            </Text>
            <SegmentedButtons
              value={mode}
              onValueChange={(val) => setMode(val as any)}
              style={styles.segmentedButtons}
              buttons={[
                { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
                { value: 'dark', label: 'Dark', icon: 'weather-night' },
                { value: 'system', label: 'Auto', icon: 'theme-light-dark' },
              ]}
            />
            <View style={{ flex: 1 }} />
            <Text variant="bodySmall" style={styles.versionText}>
              App Version: {Constants.expoConfig?.version || '1.0.0'}
            </Text>
          </View>
        </Surface>
      </Animated.View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.welcomeText}>
          System Control Panel
        </Text>
        
        <View style={styles.grid}>
          {widgets.map((w) => {
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
                    {/* Hover state indicator stripe */}
                    {isHovered && <View style={styles.hoverIndicator} />}
                    
                    <View style={styles.widgetMeta}>
                      <View style={styles.widgetHeaderRow}>
                        <MaterialCommunityIcons
                          name={w.icon as any}
                          size={22}
                          color={isHovered ? theme.colors.primary : theme.colors.onSurfaceVariant}
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
    drawerItems: {
      paddingVertical: 12,
      paddingHorizontal: 8,
      gap: 4,
      flex: 1,
    },
    drawerDivider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginVertical: 8,
    },
    drawerSectionHeader: {
      marginHorizontal: 8,
      marginVertical: 4,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    segmentedButtons: {
      marginHorizontal: 8,
      marginVertical: 8,
    },
    versionText: {
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
      opacity: 0.5,
      paddingBottom: 16,
    },
  });
