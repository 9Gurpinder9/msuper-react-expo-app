import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, Pressable } from 'react-native';
import {
  Text,
  useTheme,
  MD3Theme,
  Card,
  Button,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import TopAppBar from '@company/components/TopAppBar';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';
import { useToast } from '@utils/toast';
import { useCompanyNavItems } from '../../../src/company/hooks/useCompanyNavItems';

type HealthStatus = 'checking' | 'online' | 'offline';

type TeamMember = {
  name: string;
  action: string;
  time: string;
};

const TEAM_MEMBERS: TeamMember[] = [
  { name: 'Alex J.', action: 'Updated: Marketing Assets', time: '2m ago' },
  { name: 'Sarah W.', action: 'Added: New Category', time: '15m ago' },
  { name: 'Michael K.', action: 'Logged in', time: '1h ago' },
];

export default function CompanyDashboard() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { showSuccess } = useToast();
  const { allowedFeatures } = useCompanyNavItems();

  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('online');

  const isDesktop = width >= 768;

  useEffect(() => {
    // Disabled automatic /healthz API call on mount
  }, []);

  const checkSystemHealth = async () => {
    // Left as manual utility if needed, but no longer runs automatically
  };

  const healthDisplay = useMemo(() => {
    switch (healthStatus) {
      case 'online': return { label: 'All Systems Online', icon: 'check-circle' as const };
      case 'offline': return { label: 'Service Disruption', icon: 'alert-circle' as const };
      case 'checking': return { label: 'Checking...', icon: 'sync' as const };
    }
  }, [healthStatus]);

  const cards = useMemo(() => [
    {
      key: 'welcome',
      title: 'Workspace Active',
      subtitle: 'Your company control panel is ready. Select modules from the side menu.',
      icon: 'office-building' as const,
      onPress: () => {},
    },
  ], []);

  const renderCategorySection = (title: string, items: typeof cards) => {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{items.length}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {items.map((c) => {
            const isHovered = hoverKey === c.key;
            return (
              <Pressable
                key={c.key}
                onHoverIn={() => setHoverKey(c.key)}
                onHoverOut={() => setHoverKey((k) => (k === c.key ? null : k))}
                style={styles.gridItem}
                onPress={c.onPress}
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
                          name={c.icon}
                          size={22}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={styles.widgetTitle}>
                          {c.title}
                        </Text>
                      </View>
                      <Text style={styles.widgetSubtitle}>
                        {c.subtitle}
                      </Text>
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
      <TopAppBar title="Company Dashboard" />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {renderCategorySection('Overview', cards)}
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
    welcomeText: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.onBackground,
      letterSpacing: -0.3,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: -8,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgePrimary: {
      backgroundColor: theme.colors.primary,
    },
    badgePrimaryText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.onPrimary,
      textTransform: 'uppercase',
    },
    badgeCountPill: {
      backgroundColor: theme.colors.primaryContainer,
    },
    badgeCountTextPill: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.onPrimaryContainer,
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
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderColor: theme.colors.outlineVariant,
      borderWidth: 1,
      overflow: 'hidden',
      // Web transitions
      transitionProperty: 'transform, box-shadow, border-color, shadow-opacity',
      transitionDuration: '300ms',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
    featuredRow: {
      flexDirection: 'column',
      gap: 20,
      marginTop: 10,
    },
    desktopFeaturedRow: {
      flexDirection: 'row',
    },
    featuredCard: {
      borderRadius: 16,
      borderColor: theme.colors.outlineVariant,
      borderWidth: 1,
      overflow: 'hidden',
    },
    efficiencyCard: {
      flex: 3,
      backgroundColor: theme.colors.surfaceVariant,
    },
    teamCard: {
      flex: 2,
      backgroundColor: theme.colors.primaryContainer,
      borderColor: theme.colors.primary,
    },
    efficiencyContent: {
      justifyContent: 'space-between',
      minHeight: 180,
      gap: 16,
      position: 'relative',
    },
    efficiencyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    efficiencySubtitle: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    efficiencyBtn: {
      borderRadius: 999,
      alignSelf: 'flex-start',
    },
    efficiencyDecor: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '33%',
      opacity: 0.08,
      backgroundColor: theme.colors.primary,
    },
    teamTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.onPrimaryContainer,
      marginBottom: 16,
    },
    teamList: {
      gap: 8,
    },
    teamItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
    },
    teamMeta: {
      flex: 1,
      gap: 2,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.onPrimary,
    },
    memberAction: {
      fontSize: 12,
      color: theme.colors.onPrimary,
      opacity: 0.9,
    },
    memberTime: {
      fontSize: 11,
      color: theme.colors.onPrimary,
      opacity: 0.8,
    },
  });
