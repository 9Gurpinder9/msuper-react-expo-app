// frontend/app/(app)/super-admin/companies/menu-permissions.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Button,
  TextInput as PaperTextInput,
  useTheme,
  MD3Theme,
  Portal,
  Surface,
  Switch,
  Divider,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

type FeaturePermission = {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_enabled: boolean;
};

export default function CompanyMenuPermissions() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Target Company details
  const [companyName, setCompanyName] = useState('Loading...');

  // Features list
  const [features, setFeatures] = useState<FeaturePermission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allowAll, setAllowAll] = useState(false);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      // Load company profile details
      const companyRes = await fetchJson(`${API_BASE_URL}/super-admin/companies?limit=5000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (companyRes.ok && companyRes.data) {
        const matched = (companyRes.data.data || []).find((c: any) => String(c.id) === String(companyId));
        if (matched) {
          setCompanyName(matched.name);
        } else {
          setCompanyName(`Company ID: ${companyId}`);
        }
      }

      // Load feature catalog for company
      const featuresRes = await fetchJson(`${API_BASE_URL}/super-admin/companies/${companyId}/features`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (featuresRes.ok && featuresRes.data) {
        const dataList = (featuresRes.data.data || []) as FeaturePermission[];
        setFeatures(dataList);

        // Check if all are active to initialize the master toggle
        const allEnabled = dataList.length > 0 && dataList.every((f) => f.is_enabled);
        setAllowAll(allEnabled);
      } else {
        showError('Failed to load menu list');
      }
    } catch {
      showError('Network error loading menu parameters');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleFeature = (id: number) => {
    setFeatures((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, is_enabled: !f.is_enabled } : f));
      const allEnabled = updated.length > 0 && updated.every((f) => f.is_enabled);
      setAllowAll(allEnabled);
      return updated;
    });
  };

  const handleToggleAllowAll = (value: boolean) => {
    setAllowAll(value);
    setFeatures((prev) => prev.map((f) => ({ ...f, is_enabled: value })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const enabledIds = features.filter((f) => f.is_enabled).map((f) => f.id);

      const response = await fetchJson(`${API_BASE_URL}/super-admin/companies/${companyId}/features`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature_ids: enabledIds }),
      });

      if (response.ok) {
        showSuccess('Menu permissions updated successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Failed to update menu permissions');
      }
    } catch {
      showError('Network error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  const filteredFeatures = useMemo(() => {
    return features.filter((f) =>
      f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [features, searchQuery]);

  if (loading) {
    return <AppLoader message="Loading menu configurations..." icon="database-sync-outline" />;
  }

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Menu Permissions"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Unified Configuration Card */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Target Organization Details
          </Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Company Name:</Text>
            <Text style={styles.detailValue}>{companyName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Company Id:</Text>
            <Text style={styles.detailValue}>{companyId}</Text>
          </View>

          <Divider style={{ marginVertical: 4 }} />

          {/* Master Toggle */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                Allow all menu
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                Enable access to all application features and sections
              </Text>
            </View>
            <Switch
              value={allowAll}
              onValueChange={handleToggleAllowAll}
              color={theme.colors.primary}
              testID="allow-all-menu-switch"
            />
          </View>

          <Divider style={{ marginVertical: 4 }} />

          {/* Search Bar */}
          <View style={styles.searchRow}>
            <PaperTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search menu name..."
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              mode="outlined"
              dense
              left={<PaperTextInput.Icon icon="magnify" />}
              outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
              activeOutlineColor={theme.colors.primary}
              style={styles.searchbar}
              testID="menu-permissions-search"
            />
          </View>

          {/* Table View of Menus matching index.tsx styles */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <View style={[styles.headerCell, styles.colSr]}>
                <Text style={styles.headerText}>Sno.</Text>
              </View>
              <View style={[styles.headerCell, styles.colMenu]}>
                <Text style={styles.headerText}>Menu Name</Text>
              </View>
              <View style={[styles.headerCell, styles.colToggle, { borderRightWidth: 0, alignItems: 'center' }]}>
                <Text style={styles.headerText}>Enable/Disable</Text>
              </View>
            </View>

            {filteredFeatures.map((item, index) => {
              const isLast = index === filteredFeatures.length - 1;
              return (
                <View key={item.id} style={[styles.tableRow, isLast && { borderBottomWidth: 0 }]}>
                  <View style={[styles.tableCell, styles.colSr]}>
                    <Text style={styles.cellText}>{index + 1}</Text>
                  </View>
                  <View style={[styles.tableCell, styles.colMenu]}>
                    <Text style={styles.menuNameText}>{item.display_name}</Text>
                  </View>
                  <View style={[styles.tableCell, styles.colToggle, { borderRightWidth: 0, alignItems: 'center', justifyContent: 'center' }]}>
                    <Switch
                      value={item.is_enabled}
                      onValueChange={() => handleToggleFeature(item.id)}
                      color={theme.colors.primary}
                      testID={`menu-switch-${item.id}`}
                    />
                  </View>
                </View>
              );
            })}

            {filteredFeatures.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No menus found matching search.</Text>
              </View>
            )}
          </View>
        </Surface>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={saving}
          buttonColor={theme.colors.secondary}
          textColor={theme.colors.onSecondary}
          style={styles.saveBtn}
          testID="save-menu-permissions-button"
        >
          Save Permissions
        </Button>
      </ScrollView>

      {/* Save Overlay */}
      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Saving permissions..." icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1 },
    scrollContent: { padding: 16, gap: 16, paddingBottom: 60 },
    card: {
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: 16,
      gap: 14,
    },
    sectionTitle: { fontWeight: '800', color: theme.colors.onSurface, letterSpacing: -0.2, marginBottom: 4 },
    detailRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 8 },
    detailLabel: { fontWeight: '600', color: theme.colors.onSurfaceVariant, fontSize: 13 },
    detailValue: { fontWeight: '700', color: theme.colors.onSurface, fontSize: 14 },
    searchRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      width: '100%',
      marginTop: 8,
    },
    searchbar: {
      width: 220,
      height: 38,
      borderRadius: 8,
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
    },
    saveBtn: { borderRadius: 8, alignSelf: 'center', minWidth: 140, marginTop: 8 },
    tableContainer: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      marginTop: 8,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      alignItems: 'stretch',
    },
    headerCell: {
      paddingHorizontal: 6,
      paddingVertical: 12,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      justifyContent: 'center',
    },
    headerText: {
      fontWeight: '700',
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      alignItems: 'stretch',
    },
    tableCell: {
      paddingHorizontal: 6,
      paddingVertical: 10,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      justifyContent: 'center',
      minHeight: 44,
    },
    cellText: {
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    menuNameText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    emptyContainer: {
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
    },
    colSr: { width: 60 },
    colMenu: { flex: 1 },
    colToggle: { width: 130 },
  });
