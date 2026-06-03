// frontend/app/(app)/super-admin/countries.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, Keyboard } from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Dialog,
  Portal,
  TextInput,
  Switch,
  FAB,
  Searchbar,
  useTheme,
  Avatar,
  Appbar,
  MD3Theme,
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

type Country = {
  id: string;
  uuid: string;
  name: string;
  code: string;
  phone_code: string | null;
  is_active: boolean;
};

export default function CountriesRegistry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [countries, setCountries] = useState<Country[]>([]);
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
  const [code, setCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; code?: string }>({});

  const fetchCountries = async (query = '', pageNum = 1, isLoadMore = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const baseUrl = `${API_BASE_URL}/super-admin/countries`;
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
          setCountries((prev) => [...prev, ...newItems]);
        } else {
          setCountries(newItems);
        }
        setTotalRecords(response.data.pagination?.total || 0);
        setHasMore(response.data.pagination?.has_more ?? false);
        setPage(pageNum);
      } else {
        showError(response.data?.message || 'Failed to load countries');
      }
    } catch {
      showError('Network error loading countries');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchCountries(search, page + 1, true);
  };

  useEffect(() => {
    fetchCountries(search, 1, false);
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
    setCode('');
    setPhoneCode('');
    setIsActive(true);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleOpenEdit = (item: Country) => {
    setEditId(item.id);
    setName(item.name);
    setCode(item.code);
    setPhoneCode(item.phone_code || '');
    setIsActive(item.is_active);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleSave = async () => {
    const errors: { name?: string; code?: string } = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Country Name must be at least 2 characters.';
    }
    if (!code.trim() || code.trim().length < 2) {
      errors.code = 'ISO Code must be at least 2 characters.';
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
        ? `${API_BASE_URL}/super-admin/countries/${editId}`
        : `${API_BASE_URL}/super-admin/countries`;
      const method = editId ? 'PUT' : 'POST';

      const response = await fetchJson(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          phone_code: phoneCode.trim() || null,
          is_active: isActive,
        }),
      });

      if (response.ok) {
        showSuccess(response.data?.message || 'Country saved successfully');
        setDialogVisible(false);
        fetchCountries(search);
      } else {
        // Handle duplicate record conflict or validation message
        showError(response.data?.message || 'Failed to save country details.');
      }
    } catch {
      showError('Network error saving country.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: Country, newStatus: boolean) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/super-admin/countries/${item.id}/status`;

      // Update locally first for smooth UI UX
      setCountries((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: newStatus } : c))
      );

      const response = await fetchJson(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) {
        // Rollback
        setCountries((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, is_active: !newStatus } : c))
        );
        showError(response.data?.message || 'Failed to update status.');
      } else {
        showSuccess(response.data?.message || 'Status updated.');
      }
    } catch {
      // Rollback
      setCountries((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: !newStatus } : c))
      );
      showError('Network error updating status.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Countries"
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
        <AppLoader message="Loading countries..." icon="database-sync-outline" />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={[styles.tableContainer, { width: 700 }]}>
              {renderTableHeader()}
              <FlatList
                data={countries}
                keyExtractor={(item) => item.id}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  loadingMore ? (
                    <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
                  ) : null
                }
                ListEmptyComponent={
                  <View style={[styles.emptyContainer, { width: 700 }]}>
                    <MaterialCommunityIcons name="earth-off" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                    <Text variant="bodyLarge" style={styles.emptyText}>
                      No countries registered yet.
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
            data={countries}
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
                  No countries registered yet.
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

      <TopSlideDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        title={editId ? 'Update Country Details' : 'Register New Country'}
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
            Country Name
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => { setName(v); if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined })); }}
            mode="outlined"
            placeholder="E.g., India, United States"
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            textColor={theme.colors.onSurface}
            outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
            activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
          />
          {fieldErrors.name ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.name}</Text>
          ) : null}
        </View>
        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
            <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
            ISO Abbreviated Code
          </Text>
          <TextInput
            value={code}
            onChangeText={(v) => { setCode(v); if (fieldErrors.code) setFieldErrors((e) => ({ ...e, code: undefined })); }}
            mode="outlined"
            placeholder="E.g., IN, US"
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            autoCapitalize="characters"
            maxLength={10}
            textColor={theme.colors.onSurface}
            outlineColor={fieldErrors.code ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
            activeOutlineColor={fieldErrors.code ? theme.colors.error : theme.colors.primary}
          />
          {fieldErrors.code ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.code}</Text>
          ) : null}
        </View>
        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>Phone Dial Code</Text>
          <TextInput
            value={phoneCode}
            onChangeText={setPhoneCode}
            mode="outlined"
            placeholder="E.g., +91, +1"
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            textColor={theme.colors.onSurface}
            outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
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
            <AppLoader message={editId ? 'Updating country details...' : 'Registering new country...'} icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
    </View>
  );

  function renderTableHeader() {
    return (
      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, styles.cellId]}>
          <Text style={styles.headerText}>ID</Text>
        </View>
        <View style={[styles.headerCell, styles.cellCountry]}>
          <Text style={styles.headerText}>Country</Text>
        </View>
        <View style={[styles.headerCell, styles.cellCode]}>
          <Text style={styles.headerText}>Code</Text>
        </View>
        <View style={[styles.headerCell, styles.cellDial]}>
          <Text style={styles.headerText}>Dial</Text>
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

  function renderTableItem({ item, index }: { item: Country; index: number }) {
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellId]}>
          <Text style={styles.cellText}>{index + 1}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCountry]}>
          <Text style={styles.countryName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCode]}>
          <Text style={styles.cellText}>{item.code}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellDial]}>
          <Text style={styles.cellText}>{item.phone_code || '-'}</Text>
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

  function renderListItem({ item, index }: { item: Country; index: number }) {
    const isLast = index === countries.length - 1;
    return (
      <View style={[styles.listItem, isLast && styles.listItemLast]}>
        <Avatar.Text
          size={36}
          label={item.code.substring(0, 2)}
          style={{ backgroundColor: theme.colors.secondaryContainer }}
          labelStyle={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}
        />
        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Code: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.code}</Text> | Dial: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.phone_code || '-'}</Text>
          </Text>
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
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerBar: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    searchbar: {
      elevation: 0,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      height: 44,
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
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
    // Table View
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
    cellId: {
      width: 60,
    },
    cellCountry: {
      width: 190,
    },
    cellCode: {
      width: 100,
    },
    cellDial: {
      width: 100,
    },
    cellStatus: {
      width: 130,
    },
    cellAction: {
      width: 120,
    },
    countryName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    countryCode: {
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
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
    // List View
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
    subDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    detailLabel: {
      color: theme.colors.onSurfaceVariant,
      opacity: 0.8,
    },
    listRightCol: {
      alignItems: 'flex-end',
      justifyContent: 'center',
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
    dialog: {
      backgroundColor: theme.colors.elevation.level3,
      borderRadius: 16,
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      margin: 16,
    },
    dialogSwitchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
  });
