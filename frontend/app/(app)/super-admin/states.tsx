// frontend/app/(app)/super-admin/states.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, Keyboard } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Dialog,
  Portal,
  Switch,
  ActivityIndicator,
  useTheme,
  MD3Theme,
  Avatar,
  FAB,
  Searchbar,
  Appbar,
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

type StateItem = {
  id: string;
  name: string;
  code: string;
  country_id: string;
  country_name: string;
  is_active: boolean;
};

type CountryItem = {
  id: string;
  name: string;
  code: string;
};

export default function StatesRegistry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [states, setStates] = useState<StateItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
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

  // Main Form Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [countryId, setCountryId] = useState('');
  const [countryName, setCountryName] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; code?: string; country?: string }>({});

  // Country Picker Modal state
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Load States & Countries list
  const fetchCountries = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetchJson(`${API_BASE_URL}/super-admin/countries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && response.data) {
        // Only load active countries
        const activeList = (response.data.data || []).filter((c: any) => c.is_active);
        setCountries(activeList);
      }
    } catch (err) {
      console.error('Error fetching countries list', err);
    }
  };

  const fetchStates = async (query = '', pageNum = 1, isLoadMore = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const baseUrl = `${API_BASE_URL}/super-admin/states`;
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
          setStates((prev) => [...prev, ...newItems]);
        } else {
          setStates(newItems);
        }
        setTotalRecords(response.data.pagination?.total || 0);
        setHasMore(response.data.pagination?.has_more ?? false);
        setPage(pageNum);
      } else {
        showError(response.data?.message || 'Failed to load states');
      }
    } catch {
      showError('Network error loading states');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchStates(search, page + 1, true);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    fetchStates(search, 1, false);
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
    setCountryId('');
    setCountryName('');
    setName('');
    setCode('');
    setIsActive(true);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleOpenEdit = (item: StateItem) => {
    setEditId(item.id);
    setCountryId(String(item.country_id));
    setCountryName(item.country_name);
    setName(item.name);
    setCode(item.code);
    setIsActive(item.is_active);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleSave = async () => {
    const errors: { name?: string; code?: string; country?: string } = {};
    if (!countryId) {
      errors.country = 'Country selection is required.';
    }
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'State Name must be at least 2 characters.';
    }
    if (!code.trim() || code.trim().length < 2) {
      errors.code = 'State Code must be at least 2 characters.';
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
        ? `${API_BASE_URL}/super-admin/states/${editId}`
        : `${API_BASE_URL}/super-admin/states`;
      const method = editId ? 'PUT' : 'POST';

      const response = await fetchJson(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country_id: countryId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          is_active: isActive,
        }),
      });

      if (response.ok) {
        showSuccess(response.data?.message || 'State saved successfully');
        setDialogVisible(false);
        fetchStates(search);
      } else {
        showError(response.data?.message || 'Failed to save state details.');
      }
    } catch {
      showError('Network error saving state.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: StateItem, newStatus: boolean) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/super-admin/states/${item.id}/status`;

      // Update state locally first
      setStates((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, is_active: newStatus } : s))
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
        showError(response.data?.message || 'Failed to update status');
        // Revert on failure
        setStates((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, is_active: !newStatus } : s))
        );
      } else {
        showSuccess(response.data?.message || 'Status updated successfully');
      }
    } catch {
      showError('Network error updating status');
      // Revert on failure
      setStates((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, is_active: !newStatus } : s))
      );
    }
  };

  // Filtered countries for the picker dialog
  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  function renderTableHeader() {
    return (
      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, styles.cellId]}>
          <Text style={styles.headerText}>ID</Text>
        </View>
        <View style={[styles.headerCell, styles.cellState]}>
          <Text style={styles.headerText}>State</Text>
        </View>
        <View style={[styles.headerCell, styles.cellCountry]}>
          <Text style={styles.headerText}>Country</Text>
        </View>
        <View style={[styles.headerCell, styles.cellCode]}>
          <Text style={styles.headerText}>Code</Text>
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

  function renderTableItem({ item, index }: { item: StateItem; index: number }) {
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellId]}>
          <Text style={styles.cellText}>{index + 1}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellState]}>
          <Text style={styles.stateName}>{item.name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCountry]}>
          <Text style={styles.cellText}>{item.country_name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCode]}>
          <Text style={styles.cellText}>{item.code}</Text>
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

  function renderListItem({ item, index }: { item: StateItem; index: number }) {
    const isLast = index === states.length - 1;
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
            Code: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.code}</Text> | Country: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.country_name}</Text>
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

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="States"
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
        <AppLoader message="Loading states..." icon="database-sync-outline" />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={[styles.tableContainer, { width: 700 }]}>
              {renderTableHeader()}
              <FlatList
                data={states}
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
                    <MaterialCommunityIcons name="map-marker-off" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                    <Text variant="bodyLarge" style={styles.emptyText}>
                      No states registered yet.
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
            data={states}
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
                <MaterialCommunityIcons name="map-marker-off" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No states registered yet.
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

      {/* States Add/Edit Dialog */}
      <TopSlideDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        title={editId ? 'Update State Details' : 'Register New State'}
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
        {/* Country Selector Field (Dropdown UI) */}
        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
            <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
            Country
          </Text>
          <Pressable onPress={() => setCountryPickerVisible(true)}>
            <View pointerEvents="none">
              <TextInput
                value={countryName}
                mode="outlined"
                placeholder="Select Country"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                textColor={theme.colors.onSurface}
                editable={false}
                outlineColor={fieldErrors.country ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={fieldErrors.country ? theme.colors.error : theme.colors.primary}
                right={<TextInput.Icon icon="chevron-down" color={theme.colors.onSurfaceVariant} />}
              />
            </View>
          </Pressable>
          {fieldErrors.country ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>
              {fieldErrors.country}
            </Text>
          ) : null}
        </View>

        {/* State Name */}
        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
            <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
            State Name
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
            }}
            mode="outlined"
            placeholder="E.g., California, Ontario"
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            textColor={theme.colors.onSurface}
            outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
            activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
          />
          {fieldErrors.name ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.name}</Text>
          ) : null}
        </View>

        {/* State Code */}
        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
            <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
            State Code
          </Text>
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v);
              if (fieldErrors.code) setFieldErrors((e) => ({ ...e, code: undefined }));
            }}
            mode="outlined"
            placeholder="E.g., CA, ON"
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

        {/* Status Switch */}
        <View style={{ gap: 4, alignItems: 'flex-start' }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>Enable/Disable</Text>
          <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
        </View>
      </TopSlideDialog>

      {/* Country Search Picker Modal Dialog */}
      <Portal>
        <Dialog
          visible={countryPickerVisible}
          onDismiss={() => setCountryPickerVisible(false)}
          style={[styles.dialog, { maxHeight: '80%' }]}
        >
          <Dialog.Title style={{ fontWeight: '800', textAlign: 'center' }}>Select Country</Dialog.Title>
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Searchbar
              placeholder="Search country..."
              onChangeText={setCountrySearch}
              value={countrySearch}
              style={styles.pickerSearchbar}
              inputStyle={{ minHeight: 0 }}
              iconColor={theme.colors.onSurfaceVariant}
              clearIcon={(p) => <MaterialCommunityIcons name="close" size={20} color={p.color} />}
              onClearIconPress={() => setCountrySearch('')}
            />
          </View>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCountryId(String(item.id));
                    setCountryName(item.name);
                    setFieldErrors((prev) => ({ ...prev, country: undefined }));
                    setCountryPickerVisible(false);
                    setCountrySearch('');
                  }}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    pressed && { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Avatar.Text
                    size={28}
                    label={item.code.substring(0, 2)}
                    style={{ backgroundColor: theme.colors.secondaryContainer }}
                    labelStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 11, fontWeight: '700' }}
                  />
                  <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '500', color: theme.colors.onSurface }}>
                    {item.name} ({item.code})
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>No active countries found</Text>
                </View>
              }
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => { setCountryPickerVisible(false); setCountrySearch(''); }}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Centralized saving overlay */}
      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message={editId ? 'Updating state details...' : 'Registering new state...'} icon="database-sync-outline" transparent />
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
    cellState: {
      width: 190,
    },
    cellCountry: {
      width: 150,
    },
    cellCode: {
      width: 100,
    },
    cellStatus: {
      width: 130,
    },
    cellAction: {
      width: 120,
    },
    stateName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
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
    pickerSearchbar: {
      elevation: 0,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
      height: 40,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
  });
