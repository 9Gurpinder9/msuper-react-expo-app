import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme, MD3Theme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDrawer } from '@super-admin/context/DrawerContext';
import SidebarDrawer from '@super-admin/components/SidebarDrawer';
import SidebarPanel from '@super-admin/components/SidebarPanel';
import { PANEL_WIDTH } from '@super-admin/components/SidebarPanel';
import SidebarRail from '@super-admin/components/SidebarRail';
import { RAIL_WIDTH } from '@super-admin/components/SidebarRail';
import type { NavSection } from '@super-admin/sidebarNavItems';

type Props = {
  showSidebar?: boolean;
  navSections: NavSection[];
  headerTitle: string;
  headerIcon: string;
  headerSubtitle?: string;
  currentRoute: string;
  onLogout: () => void;
  animatedMode?: boolean;
  floatCollapseButton?: boolean;
  children: React.ReactNode;
};

export default function ResponsiveSidebarLayout({ showSidebar = true, navSections, headerTitle, headerIcon, headerSubtitle = '', currentRoute, onLogout, animatedMode = false, floatCollapseButton = false, children }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { open, closeDrawer, mode, expanded, toggleDrawer } = useDrawer();

  return (
    <View style={styles.container}>
      {showSidebar && mode === 'persistent' && (
        animatedMode ? (
          <SidebarPanel
            currentRoute={currentRoute}
            navSections={navSections}
            headerTitle={headerTitle}
            headerIcon={headerIcon}
            headerSubtitle={headerSubtitle}
            onLogout={onLogout}
            animatedMode
            collapsed={!expanded}
          />
        ) : (
          expanded ? (
            <SidebarPanel
              currentRoute={currentRoute}
              navSections={navSections}
              headerTitle={headerTitle}
              headerIcon={headerIcon}
              headerSubtitle={headerSubtitle}
              onLogout={onLogout}
            />
          ) : (
            <SidebarRail
              currentRoute={currentRoute}
              navSections={navSections}
              onLogout={onLogout}
            />
          )
        )
      )}

      <View style={styles.content}>
        {children}
      </View>

      {showSidebar && mode === 'persistent' && floatCollapseButton && expanded && (
        <Pressable
          onPress={toggleDrawer}
          style={[
            styles.floatingBtn,
            {
              left: (expanded ? PANEL_WIDTH : RAIL_WIDTH) - 14,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          accessibilityLabel={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <MaterialCommunityIcons
            name={expanded ? 'chevron-left' : 'chevron-right'}
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>
      )}

      {showSidebar && mode === 'overlay' && (
        <SidebarDrawer
          open={open}
          onClose={closeDrawer}
          currentRoute={currentRoute}
          navSections={navSections}
          headerTitle={headerTitle}
          headerIcon={headerIcon}
          headerSubtitle={headerSubtitle}
          onLogout={onLogout}
        />
      )}
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    floatingBtn: {
      position: 'absolute',
      top: 20,
      width: 28,
      height: 28,
      borderRadius: 7,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      elevation: 2,
    },
  });
