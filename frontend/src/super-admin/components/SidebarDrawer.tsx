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
  IconButton,
  Surface,
  useTheme,
  MD3Theme,
  Tooltip,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useThemeMode } from '@theme';
import type { NavSection } from '@super-admin/sidebarNavItems';
import { getIconColor } from '@super-admin/sidebarNavItems';

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
  const styles = makeStyles(theme);
  const { mode, setMode } = useThemeMode();
  const router = useRouter();
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

  const navigateTo = (path: string) => {
    onClose();
    if (currentRoute !== path) {
      router.push(path as any);
    }
  };

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
          { width: drawerWidth, transform: [{ translateX: tx }] },
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
          >
            {navSections.map((section) => (
              <View key={section.title}>
                <Text style={styles.sectionHeader}>{section.title}</Text>
                {section.items.map((item) => {
                  const isActive = currentRoute === item.path;
                  return (
                    <Pressable
                      key={item.path}
                      onPress={() => navigateTo(item.path)}
                      style={({ pressed }) => [
                        styles.navItem,
                        isActive && styles.navItemActive,
                        pressed && !isActive && styles.navItemPressed,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={18}
                        color={isActive ? theme.colors.onPrimary : getIconColor(item.colorKey, theme.dark)}
                        style={styles.navIcon}
                      />
                      <Text
                        style={[
                          styles.navLabel,
                          isActive && styles.navLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <View style={styles.divider} />
              </View>
            ))}

            <View style={styles.footerSection}>
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
                <MaterialCommunityIcons name="logout" size={16} color={theme.colors.secondary} style={{ opacity: 0.7 }} />
                <Text style={styles.logoutLabel}>Logout</Text>
              </Pressable>

              <View style={styles.themeCard}>
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
                <Tooltip title="System Mode">
                  <IconButton
                    icon="theme-light-dark"
                    size={16}
                    onPress={() => setMode('system')}
                    iconColor={mode === 'system' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={[styles.themeBtn, mode === 'system' && styles.themeBtnActive]}
                  />
                </Tooltip>
                <Text style={styles.versionText}>
                  v{Constants.expoConfig?.version || '1.0.0'}
                </Text>
              </View>
            </View>
          </ScrollView>
        </Surface>
      </Animated.View>
    </>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.colors.elevation.level2,
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flexShrink: 1,
      gap: 12,
    },
    iconBox: {
      width: 44,
      height: 44,
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
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.primary,
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
    navItemActive: {
      backgroundColor: theme.colors.primary,
    },
    navItemPressed: {
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    navIcon: {
      width: 20,
      textAlign: 'center',
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
      justifyContent: 'center',
    },
    themeBtn: {
      margin: 0,
      width: 32,
      height: 32,
      borderRadius: 6,
    },
    themeBtnActive: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    versionText: {
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.5,
      marginLeft: 4,
    },
  });
