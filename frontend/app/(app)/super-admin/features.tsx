import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, Keyboard } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Switch,
  FAB,
  Searchbar,
  useTheme,
  Avatar,
  Appbar,
  ActivityIndicator,
  MD3Theme,
  Portal,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import TopSlideDialog from '@super-admin/components/TopSlideDialog';
import AppLoader from '@super-admin/components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

type FeatureItem = {
  id: string;
  uuid: string;
  name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
};

export default function FeaturesRegistry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Layout and Search Toggle states
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchRef = useRef<React.ComponentRef<typeof Searchbar>>(null);

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; displayName?: string }>({});

  const fetchFeatures = async (query = '', pageNum = 1, isLoadMore = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const baseUrl = `${API_BASE_URL}/super-admin/features`;
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      params.append('page', String(pageNum));
      params.append('limit', '20');

      const url = `${baseUrl}?${params.toString()}`;

      const response = await fetchJson(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok && response.data) {
        const newItems = response.data.data || [];
        if (isLoadMore) {
          setFeatures((prev) => [...prev, ...newItems]);
        } else {
          setFeatures(newItems);
        }
        setTotalRecords(response.data.pagination?.total || 0);
        setHasMore(response.data.pagination?.has_more ?? false);
        setPage(pageNum);
      } else {
        showError(response.data?.message || 'Failed to load features');
      }
    } catch {
      showError('Network error loading features');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchFeatures(search, page + 1, true);
  };

  useEffect(() => {
    fetchFeatures(search, 1, false);
  }, [search]);

  useEffect(() => {
    if (searchExpanded) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      Keyboard.dismiss();
    }
  }, [searchExpanded]);

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setDisplayName('');
    setDescription('');
    setIsActive(true);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleOpenEdit = (item: FeatureItem) => {
    setEditId(item.id);
    setName(item.name);
    setDisplayName(item.display_name);
    setDescription(item.description || '');
    setIsActive(item.is_active);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleSave = async () => {
    const errors: typeof fieldErrors = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Feature Name must be at least 2 characters.';
    }
    if (!displayName.trim() || displayName.trim().length < 2) {
      errors.displayName = 'Display Name must be at least 2 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = editId
        ? `${API_BASE_URL}/super-admin/features/${editId}`
        : `${API_BASE_URL}/super-admin/features`;
      const method = editId ? 'PUT' : 'POST';

      const response = await fetchJson(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          display_name: displayName.trim(),
          description: description.trim() || null,
          is_active: isActive,
        }),
      });

      if (response.ok) {
        showSuccess(editId ? 'Feature updated successfully' : 'Feature registered successfully');
        setDialogVisible(false);
        fetchFeatures(search, 1, false);
      } else {
        showError(response.data?.message || 'Error occurred during save');
      }
    } catch {
      showError('Network error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  function renderTableHeader() {
    return (
      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, styles.cellId]}>
          <Text style={styles.headerText}>ID</Text>
        </View>
        <View style={[styles.headerCell, styles.cellName]}>
          <Text style={styles.headerText}>Code Name</Text>
        </View>
        <View style={[styles.headerCell, styles.cellDisplayName]}>
          <Text style={styles.headerText}>Display Name</Text>
        </View>
        <View style={[styles.headerCell, styles.cellDescription]}>
          <Text style={styles.headerText}>Description</Text>
        </View>
        <View style={[styles.headerCell, styles.cellStatus]}>
          <Text style={styles.headerText}>Status</Text>
        </View>
        <View style={[styles.headerCell, styles.cellAction, { borderRightWidth: 0, alignItems: 'center' }]}>
          <Text style={styles.headerText}>Action</Text>
        </View>
      </View>
    );
  }

  function renderTableItem({ item, index }: { item: FeatureItem; index: number }) {
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellId]}>
          <Text style={styles.cellText}>{index + 1}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellName]}>
          <Text style={styles.codeName}>{item.name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellDisplayName]}>
          <Text style={styles.cellText}>{item.display_name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellDescription]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.description || '-'}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellStatus]}>
          <Text style={[styles.statusText, { color: item.is_active ? theme.colors.primary : theme.colors.error }]}>
            {item.is_active ? 'ACTIVE' : 'DISABLED'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.cellAction, { borderRightWidth: 0, alignItems: 'center' }]}>
          <Button
            mode={theme.dark ? 'contained-tonal' : 'outlined'}
            buttonColor={theme.dark ? theme.colors.primaryContainer : undefined}
            textColor={theme.dark ? theme.colors.onPrimaryContainer : theme.colors.primary}
            compact
            onPress={() => handleOpenEdit(item)}
            style={styles.editBtn}
            labelStyle={styles.editBtnLabel}
          >
            Edit
          </Button>
        </View>
      </View>
    );
  }

  function renderListItem({ item, index }: { item: FeatureItem; index: number }) {
    const isLast = index === features.length - 1;
    return (
      <View style={[styles.listItem, isLast && styles.listItemLast]}>
        <Avatar.Text
          size={36}
          label={item.display_name.substring(0, 2).toUpperCase()}
          style={{ backgroundColor: theme.colors.secondaryContainer }}
          labelStyle={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}
        />
        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {item.display_name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            System Code: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.name}</Text>
          </Text>
          {item.description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>
              Info: <Text style={{ color: theme.colors.onSurface }}>{item.description}</Text>
            </Text>
          ) : null}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Status: <Text style={{ fontWeight: '700', color: item.is_active ? theme.colors.primary : theme.colors.error }}>{item.is_active ? 'ACTIVE' : 'DISABLED'}</Text>
          </Text>
        </View>
        <View style={styles.listRightCol}>
          <Button
            mode={theme.dark ? 'contained-tonal' : 'outlined'}
            buttonColor={theme.dark ? theme.colors.primaryContainer : undefined}
            textColor={theme.dark ? theme.colors.onPrimaryContainer : theme.colors.primary}
            compact
            onPress={() => handleOpenEdit(item)}
            style={styles.editBtn}
            labelStyle={styles.editBtnLabel}
          >
            Edit
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Features"
        showBack
        onBackPress={() => router.back()}
        actions={
          <>
            <Appbar.Action
              icon="magnify"
              color={theme.colors.onPrimary}
              onPress={() => setSearchExpanded(!searchExpanded)}
            />
            <Appbar.Action
              icon={viewMode === 'table' ? 'format-list-bulleted' : 'table-large'}
              color={theme.colors.onPrimary}
              onPress={() => setViewMode(viewMode === 'table' ? 'list' : 'table')}
            />
          </>
        }
      />

      {(searchExpanded || search.trim() !== '') && (
        <View style={styles.headerBar}>
          <Searchbar
            ref={searchRef}
            placeholder="Search by name or code..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchbar}
            inputStyle={{ minHeight: 0 }}
            iconColor={theme.colors.onSurfaceVariant}
          />
        </View>
      )}

      <View style={styles.subHeader}>
        <Text variant="bodySmall" style={styles.totalText}>
          Total records: {totalRecords}
        </Text>
      </View>

      {loading ? (
        <AppLoader message="Loading features..." icon="database-sync-outline" />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={[styles.tableContainer, { width: 780 }]}>
              {renderTableHeader()}
              <FlatList
                data={features}
                keyExtractor={(item) => item.id}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  loadingMore ? (
                    <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
                  ) : null
                }
                ListEmptyComponent={
                  <View style={[styles.emptyContainer, { width: 780 }]}>
                    <MaterialCommunityIcons name="earth-off" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                    <Text variant="bodyLarge" style={styles.emptyText}>
                      No features registered yet.
                    </Text>
                  </View>
                }
                renderItem={renderTableItem}
              />
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.listCard}>
          <FlatList
            data={features}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="earth-off" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No features registered yet.
                </Text>
              </View>
            }
            renderItem={renderListItem}
          />
        </View>
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
        color={theme.colors.onSecondary}
        onPress={handleOpenAdd}
      />

      {/* Features Add/Edit Dialog */}
      <TopSlideDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        title={editId ? 'Update Feature Details' : 'Register New Feature'}
        actions={
          <View style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <Button
              onPress={handleSave}
              disabled={saving}
              mode="contained"
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
              style={{ borderRadius: 8, alignSelf: 'center', minWidth: 140 }}
            >
              {editId ? 'Update' : 'Save'}
            </Button>
            <Button
              onPress={() => setDialogVisible(false)}
              disabled={saving}
              mode="text"
              textColor={theme.colors.onSurfaceVariant + 'B3'}
              style={{ alignSelf: 'flex-end', marginTop: 4 }}
            >
              Close
            </Button>
          </View>
        }
      >
        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
            <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
            System Code Name
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => { setName(v); if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
            mode="outlined"
            placeholder="e.g. billing_module"
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            textColor={theme.colors.onSurface}
            outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
            activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
            autoCapitalize="none"
          />
          {fieldErrors.name ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.name}</Text>
          ) : null}
        </View>

        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
            <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
            Display Name
          </Text>
          <TextInput
            value={displayName}
            onChangeText={(v) => { setDisplayName(v); if (fieldErrors.displayName) setFieldErrors((prev) => ({ ...prev, displayName: undefined })); }}
            mode="outlined"
            placeholder="e.g. Billing Module"
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            textColor={theme.colors.onSurface}
            outlineColor={fieldErrors.displayName ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
            activeOutlineColor={fieldErrors.displayName ? theme.colors.error : theme.colors.primary}
          />
          {fieldErrors.displayName ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.displayName}</Text>
          ) : null}
        </View>

        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            placeholder="Provide brief details..."
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            textColor={theme.colors.onSurface}
            outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={{ gap: 4, alignItems: 'flex-start' }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>Enable/Disable</Text>
          <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
        </View>
      </TopSlideDialog>

      {/* Centralized saving overlay */}
      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message={editId ? 'Updating feature details...' : 'Registering new feature...'} icon="database-sync-outline" transparent />
          </View>
        </Portal>
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
    headerBar: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    searchbar: {
      borderRadius: 8,
      height: 48,
      backgroundColor: theme.colors.elevation.level1,
    },
    subHeader: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalText: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    listCard: {
      flex: 1,
      margin: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    listContent: {
      paddingBottom: 80,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    listItemLast: {
      borderBottomWidth: 0,
    },
    listRightCol: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    editBtn: {
      margin: 0,
      borderColor: theme.colors.primary,
      borderRadius: 8,
    },
    editBtnLabel: {
      fontSize: 11,
      marginVertical: 2,
      marginHorizontal: 8,
    },
    // Table View styles
    tableContainer: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      flex: 1,
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
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      alignItems: 'stretch',
    },
    tableCell: {
      paddingHorizontal: 6,
      paddingVertical: 10,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      justifyContent: 'center',
    },
    cellText: {
      color: theme.colors.onSurface,
      fontSize: 13,
    },
    codeName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    emptyContainer: {
      paddingVertical: 80,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
    },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 0,
      borderRadius: 12,
    },
    // Width definitions for columns matching 780 total width
    cellId: { width: 50 },
    cellName: { width: 180 },
    cellDisplayName: { width: 180 },
    cellDescription: { width: 160 },
    cellStatus: { width: 100 },
    cellAction: { width: 110 },
  });
