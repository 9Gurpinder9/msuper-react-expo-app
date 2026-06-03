import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import {
  Text,
  Button,
  TextInput as PaperTextInput,
  Switch,
  ActivityIndicator,
  Searchbar,
  useTheme,
  MD3Theme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@super-admin/components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

type FeatureItem = {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
};

type PermissionItem = {
  feature_id: string;
  actions: string[];
};

export default function ManageRolePage() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { roleId } = useLocalSearchParams<{ roleId?: string }>();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Role details states
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});

  // Permissions state
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({}); // Key: feature_id, Value: active actions[]
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Bulk overrides states
  const [bulkAll, setBulkAll] = useState(false);
  const [bulkCreate, setBulkCreate] = useState(false);
  const [bulkRead, setBulkRead] = useState(false);
  const [bulkUpdate, setBulkUpdate] = useState(false);
  const [bulkDelete, setBulkDelete] = useState(false);

  const handleBulkAllToggle = (val: boolean) => {
    setBulkAll(val);
    setBulkCreate(val);
    setBulkRead(val);
    setBulkUpdate(val);
    setBulkDelete(val);

    setPermissions((prev) => {
      const updated = { ...prev };
      features.forEach((feature) => {
        updated[String(feature.id)] = val ? ['CREATE', 'READ', 'UPDATE', 'DELETE'] : [];
      });
      return updated;
    });
  };

  const handleBulkActionToggle = (action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE', val: boolean) => {
    if (action === 'CREATE') setBulkCreate(val);
    if (action === 'READ') setBulkRead(val);
    if (action === 'UPDATE') setBulkUpdate(val);
    if (action === 'DELETE') setBulkDelete(val);

    setPermissions((prev) => {
      const updated = { ...prev };
      features.forEach((feature) => {
        const currentActions = updated[String(feature.id)] || [];
        if (val) {
          if (!currentActions.includes(action)) {
            updated[String(feature.id)] = [...currentActions, action];
          }
        } else {
          updated[String(feature.id)] = currentActions.filter((a) => a !== action);
        }
      });
      return updated;
    });
  };

  // Sync bulkAll state when individual bulk components change
  useEffect(() => {
    if (bulkCreate && bulkRead && bulkUpdate && bulkDelete) {
      setBulkAll(true);
    } else {
      setBulkAll(false);
    }
  }, [bulkCreate, bulkRead, bulkUpdate, bulkDelete]);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      // Load active system features
      const featuresRes = await fetchJson(`${API_BASE_URL}/super-admin/features?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (featuresRes.ok && featuresRes.data) {
        const activeFeatures = (featuresRes.data.data || []).filter((f: any) => f.is_active);
        setFeatures(activeFeatures);
      }

      // If Edit Mode, load role metadata and current permissions
      if (roleId) {
        const [roleRes, permRes] = await Promise.all([
          fetchJson(`${API_BASE_URL}/super-admin/roles?limit=1000`, {
            headers: { Authorization: `Bearer ${token}` },
          }), // Get all roles to find the editing metadata
          fetchJson(`${API_BASE_URL}/super-admin/roles/${roleId}/permissions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (roleRes.ok && roleRes.data) {
          const matchedRole = (roleRes.data.data || []).find((r: any) => String(r.id) === String(roleId));
          if (matchedRole) {
            setName(matchedRole.name);
            setIsActive(matchedRole.is_active);
          }
        }

        if (permRes.ok && permRes.data) {
          const permMap: Record<string, string[]> = {};
          (permRes.data.data || []).forEach((p: PermissionItem) => {
            permMap[String(p.feature_id)] = (p.actions || []).map(a => a.toUpperCase());
          });
          setPermissions(permMap);
        }
      }
    } catch {
      showError('Failed to load metadata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleId]);

  const togglePermission = (featureId: string, action: string) => {
    setPermissions((prev) => {
      const currentActions = prev[featureId] || [];
      let updatedActions: string[];

      if (currentActions.includes(action)) {
        updatedActions = currentActions.filter((a) => a !== action);
      } else {
        updatedActions = [...currentActions, action];
      }

      return {
        ...prev,
        [featureId]: updatedActions,
      };
    });
  };

  const handleSave = async () => {
    const errors: typeof fieldErrors = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Role Name must be at least 2 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = roleId
        ? `${API_BASE_URL}/super-admin/roles/${roleId}`
        : `${API_BASE_URL}/super-admin/roles`;
      const method = roleId ? 'PUT' : 'POST';

      const response = await fetchJson(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          is_active: isActive,
        }),
      });

      if (response.ok) {
        const savedRoleId = roleId || response.data?.id;
        if (savedRoleId) {
          const payload = {
            permissions: Object.keys(permissions).map((fid) => ({
              feature_id: Number(fid),
              actions: permissions[fid].map((a) => a.toLowerCase()),
            })),
          };
          const permRes = await fetchJson(`${API_BASE_URL}/super-admin/roles/${savedRoleId}/permissions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (!permRes.ok) {
            showError('Role saved, but failed to sync permissions');
          }
        }
        showSuccess(roleId ? 'Role updated successfully' : 'Role registered successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Error occurred during save');
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
    return <AppLoader message="Loading details..." icon="database-sync-outline" />;
  }

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title={roleId ? 'Update Role Settings' : 'Create Access Role'}
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
        {/* Role Metadata details card */}
        <View style={styles.card}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Role Information
          </Text>
          
          <View style={{ gap: 4 }}>
            <Text variant="bodyMedium" style={styles.label}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              Role Name
            </Text>
            <PaperTextInput
              value={name}
              onChangeText={(v) => { setName(v); if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
              mode="outlined"
              placeholder="e.g. SYSTEM ADMINISTRATOR"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
            />
            {fieldErrors.name ? (
              <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.name}</Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text variant="bodyMedium" style={styles.label}>Status</Text>
            <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
          </View>
        </View>

        {/* Permissions Table view */}
        <View style={[styles.card, { flex: 1, minHeight: 480 }]}>
          {/* Row 1: Left-aligned dynamic title */}
          <Text variant="titleMedium" style={styles.matrixHeadingText}>
            {name.trim() ? `${name.trim().toUpperCase()} Menu Permissions` : 'Role Menu Permissions'}
          </Text>

          {/* Row 2: Left-aligned dynamic count */}
          <Text style={styles.matrixSubheadingText}>
            {searchQuery.trim()
              ? `Showing ${filteredFeatures.length} of ${features.length} menus`
              : `Total menus: ${features.length}`}
          </Text>

          {/* Row 3: Right-aligned search field */}
          <View style={styles.searchRow}>
            <Searchbar
              placeholder="Filter menus..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={[
                styles.searchbar,
                {
                  borderColor: searchFocused
                    ? theme.colors.primary
                    : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'),
                  borderWidth: 1,
                  justifyContent: 'center',
                }
              ]}
              inputStyle={{ minHeight: 0, paddingVertical: 0, alignSelf: 'center' }}
              iconColor={theme.colors.onSurfaceVariant}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>

          {/* Table Container wrapping horizontal scroll */}
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
            <View style={{ width: 640 }}>
              {/* Fixed Table Header */}
              <View style={styles.tableHeader}>
                <View style={styles.headerColMenu}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Text style={styles.headerTextBold}>Menu Name</Text>
                    <Switch
                      value={bulkAll}
                      onValueChange={handleBulkAllToggle}
                      color={theme.colors.secondary}
                      style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                    />
                  </View>
                </View>
                <View style={styles.headerColAction}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 6 }}>
                    <Text style={styles.headerTextBold}>Create</Text>
                    <Switch
                      value={bulkCreate}
                      onValueChange={(val) => handleBulkActionToggle('CREATE', val)}
                      color={theme.colors.primary}
                      style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                  </View>
                </View>
                <View style={styles.headerColAction}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 6 }}>
                    <Text style={styles.headerTextBold}>Read</Text>
                    <Switch
                      value={bulkRead}
                      onValueChange={(val) => handleBulkActionToggle('READ', val)}
                      color={theme.colors.primary}
                      style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                  </View>
                </View>
                <View style={styles.headerColAction}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 6 }}>
                    <Text style={styles.headerTextBold}>Update</Text>
                    <Switch
                      value={bulkUpdate}
                      onValueChange={(val) => handleBulkActionToggle('UPDATE', val)}
                      color={theme.colors.primary}
                      style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                  </View>
                </View>
                <View style={styles.headerColActionLast}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 6 }}>
                    <Text style={styles.headerTextBold}>Delete</Text>
                    <Switch
                      value={bulkDelete}
                      onValueChange={(val) => handleBulkActionToggle('DELETE', val)}
                      color={theme.colors.primary}
                      style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                  </View>
                </View>
              </View>

              {/* Fixed-Height Scrollable Table Body */}
              <View style={styles.tableBodyWrapper}>
                <ScrollView style={{ flex: 1 }} nestedScrollEnabled={true}>
                  {filteredFeatures.length > 0 ? (
                    filteredFeatures.map((feature, idx) => {
                      const isLast = idx === filteredFeatures.length - 1;
                      const activeActions = permissions[String(feature.id)] || [];

                      return (
                        <View key={feature.id} style={[styles.tableRow, isLast && styles.tableRowLast]}>
                          <View style={styles.headerColMenu}>
                            <Text style={styles.featureName} numberOfLines={1}>{feature.display_name}</Text>
                            <Text style={styles.featureCode} numberOfLines={1}>{feature.name}</Text>
                          </View>
                          {['CREATE', 'READ', 'UPDATE', 'DELETE'].map((action, actionIdx) => {
                            const isChecked = activeActions.includes(action);
                            const isLastCol = actionIdx === 3;
                            return (
                              <View key={action} style={isLastCol ? styles.headerColActionLast : styles.headerColAction}>
                                <Switch
                                  value={isChecked}
                                  onValueChange={() => togglePermission(String(feature.id), action)}
                                  color={theme.colors.primary}
                                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                              </View>
                            );
                          })}
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyContainer}>
                      <MaterialCommunityIcons name="menu-open" size={40} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                        No matching menus found.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Sticky Save Action Bar at bottom */}
      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={saving}
          buttonColor={theme.colors.secondary}
          textColor={theme.colors.onSecondary}
          style={styles.saveBtn}
          labelStyle={styles.saveBtnLabel}
        >
          {roleId ? 'Update' : 'Save'}
        </Button>
      </View>

      {/* Centralized saving overlay */}
      {saving && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
          <AppLoader message={roleId ? 'Updating role settings...' : 'Creating access role...'} icon="database-sync-outline" transparent />
        </View>
      )}
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
      padding: 16,
      gap: 16,
      paddingBottom: 100,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: 16,
      gap: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    sectionTitle: {
      fontWeight: '800',
      color: theme.colors.onSurface,
      letterSpacing: -0.2,
    },
    label: {
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    matrixHeadingText: {
      fontWeight: '800',
      color: theme.colors.onSurface,
      textAlign: 'left',
      marginTop: 4,
    },
    matrixSubheadingText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      opacity: 0.6,
      textAlign: 'left',
      marginTop: 2,
    },
    searchRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      width: '100%',
      marginTop: 8,
    },
    searchbar: {
      width: 220,
      height: 38,
      borderRadius: 8,
      backgroundColor: theme.colors.elevation.level1,
    },
    // Table Styling
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderBottomWidth: 0,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      alignItems: 'center',
      height: 48,
    },
    headerTextBold: {
      fontWeight: '800',
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    tableBodyWrapper: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      backgroundColor: theme.colors.surface,
      height: 320,
      overflow: 'hidden',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      alignItems: 'center',
      height: 56,
    },
    tableRowLast: {
      borderBottomWidth: 0,
    },
    featureName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.onSurface,
    },
    featureCode: {
      fontSize: 10,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    // Column widths alignment mapping matching 640 total width
    headerColMenu: {
      width: 180,
      paddingHorizontal: 12,
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      height: '100%',
    },
    headerColAction: {
      width: 115,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      height: '100%',
    },
    headerColActionLast: {
      width: 115,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    emptyContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
      alignItems: 'center',
    },
    saveBtn: {
      borderRadius: 8,
      minHeight: 40,
      minWidth: 140,
      justifyContent: 'center',
    },
    saveBtnLabel: {
      fontSize: 15,
      fontWeight: '700',
    },
  });
