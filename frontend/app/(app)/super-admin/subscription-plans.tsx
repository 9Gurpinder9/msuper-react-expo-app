import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, Keyboard } from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Switch,
  FAB,
  Searchbar,
  useTheme,
  Avatar,
  MD3Theme,
  ActivityIndicator,
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

type SubscriptionPlan = {
  id: string;
  uuid: string;
  name: string;
  description: string | null;
  price: string | number;
  amc_price: string | number;
  duration_days: number;
  is_active: boolean;
};

export default function SubscriptionPlansRegistry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
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
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [amcPrice, setAmcPrice] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    price?: string;
    amcPrice?: string;
    durationDays?: string;
  }>({});

  const fetchPlans = async (query = '', pageNum = 1, isLoadMore = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const baseUrl = `${API_BASE_URL}/super-admin/subscription-plans`;
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
          setPlans((prev) => [...prev, ...newItems]);
        } else {
          setPlans(newItems);
        }
        setTotalRecords(response.data.pagination?.total || 0);
        setHasMore(response.data.pagination?.has_more ?? false);
        setPage(pageNum);
      } else {
        showError(response.data?.message || 'Failed to load subscription plans');
      }
    } catch {
      showError('Network error loading subscription plans');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchPlans(search, page + 1, true);
  };

  useEffect(() => {
    fetchPlans(search, 1, false);
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
    setDescription('');
    setPrice('');
    setAmcPrice('');
    setDurationDays('30');
    setIsActive(true);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditId(plan.id);
    setName(plan.name);
    setDescription(plan.description || '');
    setPrice(String(plan.price));
    setAmcPrice(String(plan.amc_price));
    setDurationDays(String(plan.duration_days));
    setIsActive(plan.is_active);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const validateFields = (): boolean => {
    const errors: typeof fieldErrors = {};
    let isValid = true;

    if (!name.trim()) {
      errors.name = 'Plan name is required.';
      isValid = false;
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
      isValid = false;
    }

    const priceNum = parseFloat(price);
    const amcNum = parseFloat(amcPrice);
    const isFree = name.trim().toLowerCase() === 'free';

    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Price must be a positive number.';
      isValid = false;
    } else if (!isFree && priceNum < 1000) {
      errors.price = 'Paid plans must have a price of at least 1000.';
      isValid = false;
    }

    if (isNaN(amcNum) || amcNum < 0) {
      errors.amcPrice = 'AMC price must be a positive number.';
      isValid = false;
    } else if (!isFree && amcNum < 1000) {
      errors.amcPrice = 'Paid plans must have an AMC price of at least 1000.';
      isValid = false;
    }

    // Price must be strictly greater than AMC Price for paid plans
    if (isValid && !isFree && priceNum <= amcNum) {
      errors.price = 'Price must be strictly greater than AMC Price.';
      isValid = false;
    }

    const durationNum = parseInt(durationDays, 10);
    if (isNaN(durationNum) || durationNum < 7 || durationNum > 365) {
      errors.durationDays = 'Duration must be between 7 and 365 days.';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateFields()) return;

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        amc_price: parseFloat(amcPrice),
        duration_days: parseInt(durationDays, 10),
        is_active: isActive,
      };

      const url = editId
        ? `${API_BASE_URL}/super-admin/subscription-plans/${editId}`
        : `${API_BASE_URL}/super-admin/subscription-plans`;

      const method = editId ? 'PUT' : 'POST';

      const response = await fetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showSuccess(editId ? 'Plan updated successfully' : 'Plan registered successfully');
        setDialogVisible(false);
        fetchPlans(search);
      } else {
        showError(response.data?.message || 'Error occurred during save');
      }
    } catch {
      showError('Network error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Subscription Plans"
        showBack
        onBackPress={() => router.back()}
        actions={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppbarActionIcon
              icon={searchExpanded ? 'magnify-close' : 'magnify'}
              onPress={() => setSearchExpanded(!searchExpanded)}
              theme={theme}
            />
            <AppbarActionIcon
              icon={viewMode === 'list' ? 'table-large' : 'format-list-bulleted'}
              onPress={() => setViewMode(viewMode === 'list' ? 'table' : 'list')}
              theme={theme}
            />
          </View>
        }
      />

      {(searchExpanded || search.trim() !== '') && (
        <View style={styles.headerBar}>
          <Searchbar
            ref={searchRef}
            placeholder="Search plans..."
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
        <AppLoader message="Loading plans..." icon="database-sync-outline" />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={[styles.tableContainer, { width: 900 }]}>
              {renderTableHeader()}
              <FlatList
                data={plans}
                keyExtractor={(item) => item.id}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  loadingMore ? (
                    <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
                  ) : null
                }
                ListEmptyComponent={
                  <View style={[styles.emptyContainer, { width: 900 }]}>
                    <MaterialCommunityIcons name="card-bulleted-off-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                    <Text variant="bodyLarge" style={styles.emptyText}>
                      No plans registered yet.
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
            data={plans}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="card-bulleted-off-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No plans registered yet.
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
        title={editId ? 'Update Plan Details' : 'Register New Plan'}
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
            Plan Name
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => { setName(v); if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined })); }}
            mode="outlined"
            placeholder="E.g., Free, Silver, Gold"
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
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            placeholder="Brief details about the plan"
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            textColor={theme.colors.onSurface}
            outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              Price
            </Text>
            <TextInput
              value={price}
              onChangeText={(v) => { setPrice(v); if (fieldErrors.price) setFieldErrors((e) => ({ ...e, price: undefined })); }}
              mode="outlined"
              keyboardType="numeric"
              placeholder="E.g., 0, 1500"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.price ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.price ? theme.colors.error : theme.colors.primary}
            />
            {fieldErrors.price ? (
              <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.price}</Text>
            ) : null}
          </View>

          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              AMC Price
            </Text>
            <TextInput
              value={amcPrice}
              onChangeText={(v) => { setAmcPrice(v); if (fieldErrors.amcPrice) setFieldErrors((e) => ({ ...e, amcPrice: undefined })); }}
              mode="outlined"
              keyboardType="numeric"
              placeholder="E.g., 0, 1200"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.amcPrice ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.amcPrice ? theme.colors.error : theme.colors.primary}
            />
            {fieldErrors.amcPrice ? (
              <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.amcPrice}</Text>
            ) : null}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
            <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
            Duration (Days)
          </Text>
          <TextInput
            value={durationDays}
            onChangeText={(v) => { setDurationDays(v); if (fieldErrors.durationDays) setFieldErrors((e) => ({ ...e, durationDays: undefined })); }}
            mode="outlined"
            keyboardType="numeric"
            placeholder="Min 7, Max 365"
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            textColor={theme.colors.onSurface}
            outlineColor={fieldErrors.durationDays ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
            activeOutlineColor={fieldErrors.durationDays ? theme.colors.error : theme.colors.primary}
          />
          {fieldErrors.durationDays ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 2 }}>{fieldErrors.durationDays}</Text>
          ) : null}
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
            <AppLoader message={editId ? 'Updating plan details...' : 'Registering new plan...'} icon="database-sync-outline" transparent />
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
        <View style={[styles.headerCell, styles.cellName]}>
          <Text style={styles.headerText}>Plan Name</Text>
        </View>
        <View style={[styles.headerCell, styles.cellPrice]}>
          <Text style={styles.headerText}>Price</Text>
        </View>
        <View style={[styles.headerCell, styles.cellAmc]}>
          <Text style={styles.headerText}>AMC Price</Text>
        </View>
        <View style={[styles.headerCell, styles.cellDuration]}>
          <Text style={styles.headerText}>Duration</Text>
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

  function renderTableItem({ item, index }: { item: SubscriptionPlan; index: number }) {
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellId]}>
          <Text style={styles.cellText}>{index + 1}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellName]}>
          <Text style={styles.planTitle} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellPrice]}>
          <Text style={styles.cellText}>₹{Number(item.price).toFixed(2)}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellAmc]}>
          <Text style={styles.cellText}>₹{Number(item.amc_price).toFixed(2)}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellDuration]}>
          <Text style={styles.cellText}>{item.duration_days} Days</Text>
        </View>
        <View style={[styles.tableCell, styles.cellStatus]}>
          <Text style={[styles.statusText, { color: item.is_active ? theme.colors.primary : theme.colors.error }]}>
            {item.is_active ? 'ACTIVE' : 'DISABLED'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.cellAction, { borderRightWidth: 0, alignItems: 'center' }]}>
          <Button
            mode={theme.dark ? 'contained-tonal' : 'outlined'}
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

  function renderListItem({ item, index }: { item: SubscriptionPlan; index: number }) {
    const isLast = index === plans.length - 1;
    return (
      <View style={[styles.listItem, isLast && styles.listItemLast]}>
        <Avatar.Text
          size={36}
          label={item.name.substring(0, 2).toUpperCase()}
          style={{ backgroundColor: theme.colors.secondaryContainer }}
          labelStyle={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}
        />
        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {item.name}
          </Text>
          {item.description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Price: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>₹{Number(item.price).toFixed(2)}</Text> | AMC: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>₹{Number(item.amc_price).toFixed(2)}</Text>
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Duration: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.duration_days} Days</Text> | Status: <Text style={{ fontWeight: '700', color: item.is_active ? theme.colors.primary : theme.colors.error }}>{item.is_active ? 'ACTIVE' : 'DISABLED'}</Text>
          </Text>
        </View>
        <View style={styles.listRightCol}>
          <Button
            mode={theme.dark ? 'contained-tonal' : 'outlined'}
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

// Custom Helper for action icons
function AppbarActionIcon({ icon, onPress, theme }: { icon: string; onPress: () => void; theme: MD3Theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          padding: 8,
          borderRadius: 20,
          backgroundColor: pressed ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
          marginLeft: 4,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={24} color={theme.colors.onPrimary} />
    </Pressable>
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Table styling
    tableContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      overflow: 'hidden',
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    headerCell: {
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      justifyContent: 'center',
    },
    tableCell: {
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      justifyContent: 'center',
    },
    headerText: {
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    cellText: {
      color: theme.colors.onSurface,
      fontSize: 13,
    },
    // Custom widths matching 900 total table size
    cellId: { width: 50 },
    cellName: { width: 180 },
    cellPrice: { width: 120 },
    cellAmc: { width: 120 },
    cellDuration: { width: 120 },
    cellStatus: { width: 150 },
    cellAction: { width: 160 },
    planTitle: {
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
    // List View Card styling
    listCard: {
      flex: 1,
      margin: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      overflow: 'hidden',
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
  });
