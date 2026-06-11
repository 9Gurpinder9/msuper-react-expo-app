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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('checking');

  const isDesktop = width >= 768;

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    setHealthStatus('checking');
    try {
      const res = await fetchJson(`${API_BASE_URL}/healthz`);
      setHealthStatus(res.ok ? 'online' : 'offline');
    } catch {
      setHealthStatus('offline');
    }
  };

  const healthDisplay = useMemo(() => {
    switch (healthStatus) {
      case 'online': return { label: 'All Systems Online', icon: 'check-circle' as const, color: theme.colors.primary };
      case 'offline': return { label: 'Service Disruption', icon: 'alert-circle' as const, color: theme.colors.error };
      case 'checking': return { label: 'Checking...', icon: 'sync' as const, color: theme.colors.onSurfaceVariant };
    }
  }, [healthStatus, theme]);

  const cards = useMemo(() => [
    {
      key: 'activity',
      title: 'Activity Log',
      subtitle: 'View recent workspace updates and collaborative changes.',
      icon: 'history' as const,
      iconBg: theme.colors.tertiaryContainer,
      iconColor: theme.colors.tertiary,
      linkColor: theme.colors.tertiary,
      actionLabel: 'View Logs',
      onPress: () => {},
    },
    {
      key: 'health',
      title: 'System Health',
      subtitle: healthDisplay.label,
      icon: healthDisplay.icon,
      iconBg: theme.colors.errorContainer,
      iconColor: theme.colors.error,
      linkColor: theme.colors.error,
      actionLabel: 'Check Status',
      onPress: checkSystemHealth,
    },
  ], [theme, healthDisplay]);

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Company Dashboard" />

      <ScrollView style={styles.container} contentContainerStyle={styles.dashboardContent}>
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <Text style={styles.welcomeText}>Company Control Panel</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.badgePrimary]}>
              <Text style={styles.badgePrimaryText}>Workspace</Text>
            </View>
            <View style={[styles.badge, styles.badgeCount]}>
              <Text style={styles.badgeCountText}>{allowedFeatures.length} Modules Active</Text>
            </View>
          </View>
        </View>

        {/* Bento Grid */}
        <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
          {cards.map((c) => {
            const isHovered = hoverKey === c.key;
            return (
              <Pressable
                key={c.key}
                onHoverIn={() => setHoverKey(c.key)}
                onHoverOut={() => setHoverKey((k) => (k === c.key ? null : k))}
                style={[styles.gridItem, isDesktop && styles.desktopGridItem]}
                onPress={c.onPress}
              >
                <Card
                  mode="outlined"
                  style={[styles.card, isHovered && styles.cardHovered]}
                >
                  <Card.Content style={styles.cardContent}>
                    <View style={[styles.iconBox, { backgroundColor: c.iconBg }]}>
                      <MaterialCommunityIcons
                        name={c.icon}
                        size={24}
                        color={c.iconColor}
                      />
                    </View>
                    <Text style={styles.cardTitle}>{c.title}</Text>
                    <Text style={styles.cardSubtitle}>{c.subtitle}</Text>
                    <View style={styles.cardLink}>
                      <Text style={[styles.cardLinkText, { color: c.linkColor }]}>
                        {c.actionLabel}
                      </Text>
                      <MaterialCommunityIcons
                        name="arrow-right"
                        size={18}
                        color={c.linkColor}
                      />
                    </View>
                  </Card.Content>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Featured Section */}
        <View style={[styles.featuredRow, isDesktop && styles.desktopFeaturedRow]}>
          {/* Workspace Efficiency */}
          <Card mode="outlined" style={[styles.featuredCard, styles.efficiencyCard]}>
            <Card.Content style={styles.efficiencyContent}>
              <View>
                <Text style={styles.efficiencyTitle}>Workspace Efficiency</Text>
                <Text style={styles.efficiencySubtitle}>
                  Your team has increased productivity by 24% this month through organized bookmark sharing.
                </Text>
              </View>
              <Button
                mode="contained"
                style={styles.efficiencyBtn}
                textColor={theme.colors.onPrimary}
                onPress={() => showSuccess('Analytics up-to-date')}
              >
                View Full Analytics
              </Button>
              <View style={styles.efficiencyDecor} />
            </Card.Content>
          </Card>

          {/* Team Sync */}
          <Card
            mode="outlined"
            style={[styles.featuredCard, styles.teamCard]}
          >
            <Card.Content>
              <Text style={styles.teamTitle}>Team Sync</Text>
              <View style={styles.teamList}>
                {TEAM_MEMBERS.map((member, index) => (
                  <View
                    key={member.name}
                    style={[
                      styles.teamItem,
                      { backgroundColor: theme.colors.primary },
                      index === 2 && { opacity: 0.65 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account-circle"
                      size={32}
                      color={theme.colors.onPrimary}
                    />
                    <View style={styles.teamMeta}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberAction}>{member.action}</Text>
                    </View>
                    <Text style={styles.memberTime}>{member.time}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
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
    dashboardContent: {
      padding: 24,
      gap: 24,
    },
    heroSection: {
      gap: 10,
    },
    welcomeText: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.onBackground,
      letterSpacing: -0.6,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
    badgeCount: {
      backgroundColor: theme.colors.primaryContainer,
    },
    badgeCountText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.onPrimaryContainer,
    },
    grid: {
      flexDirection: 'column',
      gap: 16,
    },
    desktopGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    gridItem: {
      width: '100%',
    },
    desktopGridItem: {
      width: '48.5%',
      maxWidth: 500,
    },
    card: {
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderWidth: 1,
      overflow: 'hidden',
    },
    cardHovered: {
      borderColor: theme.colors.primary,
    },
    cardContent: {
      padding: 24,
      gap: 12,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    cardSubtitle: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
    },
    cardLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardLinkText: {
      fontSize: 14,
      fontWeight: '700',
    },
    featuredRow: {
      flexDirection: 'column',
      gap: 20,
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
