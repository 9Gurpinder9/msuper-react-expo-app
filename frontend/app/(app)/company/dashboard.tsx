// frontend/app/(app)/company/dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable, useWindowDimensions } from 'react-native';
import {
  Text,
  useTheme,
  MD3Theme,
  Card,
  Button,
  Surface,
  IconButton,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';

type Widget = {
  key: string;
  title: string;
  subtitle?: string;
  icon: string;
  to?: string;
};

export default function CompanyDashboard() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { width } = useWindowDimensions();
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
        to: '/company/bookmarks',
      },
    ],
    []
  );

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
        <Surface elevation={2} style={StyleSheet.absoluteFill}>
          <View style={styles.drawerHeader}>
            <View style={styles.drawerHeaderLeft}>
              <MaterialCommunityIcons
                name="office-building-outline"
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
                router.push('/company/bookmarks');
              }}
              icon={(p) => (
                <MaterialCommunityIcons
                  name="bookmark-multiple-outline"
                  size={p.size}
                  color={p.color}
                />
              )}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              Bookmarks
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/company/categories');
              }}
              icon={(p) => (
                <MaterialCommunityIcons name="shape-outline" size={p.size} color={p.color} />
              )}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              Categories
            </Button>
          </View>
        </Surface>
      </Animated.View>

      <View style={styles.container}>
        <Text variant="titleLarge" style={{ marginBottom: 12 }}>
          Welcome to Company
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
                        { backgroundColor: (theme as any).colors.secondaryContainer },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={w.icon as any}
                        size={26}
                        color={(theme as any).colors.onSecondaryContainer || theme.colors.secondary}
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
