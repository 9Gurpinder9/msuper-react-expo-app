// frontend/app/(app)/super-admin/diagnostics.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Card, Button, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import { API_BASE_URL } from '@config';

export default function SystemDiagnostics() {
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [apiHealth, setApiHealth] = useState<'checking' | 'healthy' | 'down'>('checking');
  const [dbHealth, setDbHealth] = useState<'checking' | 'healthy' | 'down'>('checking');
  const [dbDetails, setDbDetails] = useState<any>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setApiHealth('checking');
    setDbHealth('checking');

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
        setDbDetails(dbData);
        setDbHealth(dbData.connected && dbData.querySucceeded ? 'healthy' : 'down');
      } else {
        setDbHealth('down');
      }
    } catch {
      setDbHealth('down');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="System Telemetry" showBack onBackPress={() => router.back()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: '800' }}>
          Diagnostics & Node Telemetry
        </Text>

        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <View style={styles.nodeHeader}>
              <MaterialCommunityIcons name="server" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>API Server Node</Text>
            </View>
            <View style={styles.statusRow}>
              <Text variant="bodyMedium">Node Status:</Text>
              <View style={[styles.badge, apiHealth === 'healthy' ? styles.badgeSuccess : styles.badgeError]}>
                <Text style={[styles.badgeText, apiHealth === 'healthy' ? styles.textSuccess : styles.textError]}>
                  {apiHealth === 'checking' ? 'CHECKING...' : apiHealth === 'healthy' ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Base API Endpoint: {API_BASE_URL}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <View style={styles.nodeHeader}>
              <MaterialCommunityIcons name="database" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>Supabase Database Node</Text>
            </View>
            <View style={styles.statusRow}>
              <Text variant="bodyMedium">Connection State:</Text>
              <View style={[styles.badge, dbHealth === 'healthy' ? styles.badgeSuccess : styles.badgeError]}>
                <Text style={[styles.badgeText, dbHealth === 'healthy' ? styles.textSuccess : styles.textError]}>
                  {dbHealth === 'checking' ? 'CHECKING...' : dbHealth === 'healthy' ? 'CONNECTED' : 'DISCONNECTED'}
                </Text>
              </View>
            </View>
            {dbDetails && (
              <View style={styles.detailsBlock}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Latency Status: {dbDetails.status || 200} OK
                </Text>
                {dbDetails.error && (
                  <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4 }}>
                    Error Detail: {dbDetails.error.message}
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={fetchDiagnostics}
          loading={loading}
          disabled={loading}
          icon="refresh"
          style={styles.refreshBtn}
        >
          Force Retest Telemetry
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderColor: '#E2E8F0',
  },
  cardContent: {
    gap: 12,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeSuccess: {
    backgroundColor: '#CCFBF1',
  },
  textSuccess: {
    color: '#0D9488',
  },
  badgeError: {
    backgroundColor: '#FEE2E2',
  },
  textError: {
    color: '#EF4444',
  },
  detailsBlock: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  refreshBtn: {
    marginTop: 10,
    borderRadius: 10,
  },
});
