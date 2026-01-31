// frontend/app/(app)/super-admin/dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable, useWindowDimensions } from 'react-native';
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

  const drawerWidth = Math.min(320, Math.max(260, Math.floor(width * 0.75)));

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: drawerOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [drawerOpen, drawerX]);

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
        key: 'states',
        title: 'States',
        subtitle: 'Manage states list',
        icon: 'map-outline',
        color: theme.colors.primary,
        to: '/super-admin/states',
      },
      {
        key: 'cities',
        title: 'Cities',
        subtitle: 'Manage cities per state',
        icon: 'city-variant-outline',
        color: (theme as any).colors.info,
        to: '/super-admin/cities',
      },
      {
        key: 'users',
        title: 'Users',
        subtitle: 'Coming soon',
        icon: 'account-group',
        color: theme.colors.secondary,
      },
    ],
    [theme.colors.primary, (theme as any).colors.info, theme.colors.secondary]
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
        <ActivityIndicator animating color={(theme as any).colors.info} />
      </View>
    );
  }

  const tx = drawerX.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] });
  const overlayOpacity = drawerX.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Super-Admin Dashboard" showMenu onMenuPress={() => setDrawerOpen(true)} />

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
        <Surface elevation={2} style={StyleSheet.absoluteFill}>
          <View style={styles.drawerHeader}>
            <View style={styles.drawerHeaderLeft}>
              <MaterialCommunityIcons
                name="shield-account"
                size={24}
                color={theme.colors.onSurface}
              />
              <Text variant="titleMedium" style={{ marginLeft: 8 }}>
                Menu
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
                router.push('/super-admin/states');
              }}
              icon={(p) => (
                <MaterialCommunityIcons name="map-outline" size={p.size} color={p.color} />
              )}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              States
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/cities');
              }}
              icon={(p) => (
                <MaterialCommunityIcons name="city-variant-outline" size={p.size} color={p.color} />
              )}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              Cities
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/scan-bill');
              }}
              icon={(p) => (
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={p.size}
                  color={p.color}
                />
              )}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              Scan Bill
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/super-admin/online-scan-bill');
              }}
              icon={(p) => (
                <MaterialCommunityIcons
                  name="cloud-search-outline"
                  size={p.size}
                  color={p.color}
                />
              )}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              Online Scan Bill
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                handleLogout();
              }}
              icon={(p) => <MaterialCommunityIcons name="logout" size={p.size} color={p.color} />}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              Logout
            </Button>
          </View>
        </Surface>
      </Animated.View>

      {/* Grid of widgets */}
      <View style={styles.container}>
        <Text variant="titleLarge" style={{ marginBottom: 12 }}>
          Welcome, Super-Admin!
        </Text>
        <View style={styles.grid}>
          {widgets.map((w) => {
            const isHovered = hoverKey === w.key;
            return (
              <Pressable
                key={w.key}
                onHoverIn={() => setHoverKey(w.key)}
                onHoverOut={() => setHoverKey((k) => (k === w.key ? null : k))}
                style={{ width: '100%', maxWidth: 360 }}
              >
                <Card
                  mode="elevated"
                  elevation={isHovered ? 5 : 2}
                  style={[
                    styles.widget,
                    isHovered && styles.widgetHover,
                    { backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF' },
                  ]}
                  onPress={() => w.to && router.push(w.to)}
                >
                  <Card.Content style={styles.widgetContent}>
                    <View
                      style={[
                        styles.widgetIconWrap,
                        { backgroundColor: (theme as any).colors.primaryContainer },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={w.icon as any}
                        size={26}
                        color={(theme as any).colors.onPrimaryContainer || theme.colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                        {w.title}
                      </Text>
                      {!!w.subtitle && (
                        <Text variant="bodySmall" style={{ opacity: 0.8 }}>
                          {w.subtitle}
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={22}
                      color={theme.colors.onSurface}
                    />
                  </Card.Content>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: (theme as any).dark ? (theme as any).colors.surfaceVariant : '#F3F4F6',
    },
    container: {
      flex: 1,
      padding: 16,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    widget: {
      minHeight: 88,
      overflow: 'hidden',
      borderRadius: 12,
    },
    widgetHover: {
      transform: [{ translateY: -1 }],
    },
    widgetContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    widgetIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 4,
    },
    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.colors.surface,
      zIndex: 1000,
      elevation: 4,
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
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: (theme as any).colors.outlineVariant || '#00000022',
    },
    drawerHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    drawerItems: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      gap: 4,
    },
  });
