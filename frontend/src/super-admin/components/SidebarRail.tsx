import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  IconButton,
  useTheme,
  MD3Theme,
  Tooltip,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useThemeMode } from '@theme';
import { useDrawer } from '../context/DrawerContext';
import type { NavSection } from '@super-admin/sidebarNavItems';
import { getIconColor } from '@super-admin/sidebarNavItems';

export const RAIL_WIDTH = 56;

type Props = {
  currentRoute: string;
  navSections: NavSection[];
  onLogout: () => void;
};

export default function SidebarRail({ currentRoute, navSections, onLogout }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { toggleDrawer } = useDrawer();
  const { mode, setMode } = useThemeMode();
  const router = useRouter();

  const navigateTo = (path: string) => {
    if (currentRoute !== path) {
      router.push(path as any);
    }
  };

  const themeCycle = () => {
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = modes.indexOf(mode);
    setMode(modes[(idx + 1) % modes.length]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Tooltip title="Expand sidebar">
          <IconButton
            icon={(p) => <MaterialCommunityIcons name="menu" size={p.size} color={p.color} />}
            size={20}
            onPress={toggleDrawer}
            accessibilityLabel="Expand sidebar"
            iconColor={theme.colors.onSurface}
          />
        </Tooltip>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {navSections.map((section, si) => (
          <React.Fragment key={section.title}>
            {si > 0 && <View style={styles.sectionSpacer} />}
            {section.items.map((item) => {
              const isActive = currentRoute === item.path;
              return (
                <Tooltip title={item.label} key={item.path}>
                  <IconButton
                    icon={(p) => (
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={p.size}
                        color={isActive ? theme.colors.primary : getIconColor(item.colorKey, theme.dark)}
                      />
                    )}
                    size={20}
                    onPress={() => navigateTo(item.path)}
                    style={[styles.railIcon, isActive && styles.railIconActive]}
                    iconColor={isActive ? theme.colors.primary : getIconColor(item.colorKey, theme.dark)}
                  />
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </ScrollView>

      <View style={styles.bottomSection}>
        <Tooltip title={`Theme: ${mode}`}>
          <IconButton
            icon={(p) => <MaterialCommunityIcons name="theme-light-dark" size={p.size} color={p.color} />}
            size={20}
            onPress={themeCycle}
            iconColor={theme.colors.onSurfaceVariant}
          />
        </Tooltip>
        <Tooltip title="Logout">
          <IconButton
            icon={(p) => <MaterialCommunityIcons name="logout" size={p.size} color={p.color} />}
            size={20}
            onPress={onLogout}
            iconColor={theme.colors.error}
          />
        </Tooltip>
      </View>
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      width: RAIL_WIDTH,
      backgroundColor: theme.colors.elevation.level2,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      alignItems: 'center',
      paddingVertical: 8,
    },
    topSection: {
      alignItems: 'center',
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      paddingBottom: 8,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      alignItems: 'center',
      paddingVertical: 4,
    },
    sectionSpacer: {
      height: 8,
    },
    railIcon: {
      margin: 0,
      width: 40,
      height: 40,
      borderRadius: 8,
    },
    railIconActive: {
      backgroundColor: theme.colors.primaryContainer,
    },
    bottomSection: {
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
      paddingTop: 8,
      gap: 4,
    },
  });
