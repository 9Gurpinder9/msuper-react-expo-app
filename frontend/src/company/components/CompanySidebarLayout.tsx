import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme, MD3Theme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDrawer } from '../../super-admin/context/DrawerContext';
import SidebarDrawer from './SidebarDrawer';
import SidebarPanel, { PANEL_WIDTH, RAIL_WIDTH } from './SidebarPanel';
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

export default function CompanySidebarLayout({
  showSidebar = true,
  navSections,
  headerTitle,
  headerIcon,
  headerSubtitle = '',
  currentRoute,
  onLogout,
  animatedMode = false,
  floatCollapseButton = false,
  children
}: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { open, closeDrawer, mode, expanded, toggleDrawer } = useDrawer();
  const [hovered, setHovered] = React.useState(false);

  // Determine border color for side drawer / panel
  const borderColor = theme.dark ? '#334155' : '#94A3B8';

  return (
    <View style={styles.container}>
      {showSidebar && mode === 'persistent' && (
        <SidebarPanel
          currentRoute={currentRoute}
          navSections={navSections}
          headerTitle={headerTitle}
          headerIcon={headerIcon}
          headerSubtitle={headerSubtitle}
          onLogout={onLogout}
          animatedMode={animatedMode}
          collapsed={!expanded}
        />
      )}

      <View style={styles.content}>
        {children}
      </View>

      {showSidebar && mode === 'persistent' && floatCollapseButton && (
        <Pressable
          onPress={toggleDrawer}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          style={[
            styles.hoverZone,
            {
              left: (expanded ? PANEL_WIDTH : RAIL_WIDTH) - 20,
            },
          ]}
          accessibilityLabel={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <View
            style={[
              styles.floatingBtn,
              {
                backgroundColor: theme.colors.surface,
                borderColor: borderColor,
                opacity: hovered ? 1.0 : 0.0,
                position: 'absolute',
                top: 42, // Aligns button center vertically at 56px (56 - 14)
                left: 6,  // Centered horizontally inside the 40px hoverZone ((40 - 28) / 2)
              },
            ]}
          >
            <MaterialCommunityIcons
              name={expanded ? 'chevron-left' : 'chevron-right'}
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
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
      width: 28,
      height: 28,
      borderRadius: 7,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    hoverZone: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 40,
      zIndex: 20,
    },
  });
