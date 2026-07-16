// frontend/app/(app)/super-admin/subscription-plans/index.tsx
import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, Keyboard } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  MD3Theme,
  Avatar,
  FAB,
  Searchbar,
  ActivityIndicator,
  Menu,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
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
  const { showError } = useToast();

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
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchRef = useRef<React.ComponentRef<typeof Searchbar>>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<FlatList>(null);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

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

  useFocusEffect(
    React.useCallback(() => {
      fetchPlans(search, 1, false);
    }, [search])
  );

  React.useEffect(() => {
    if (searchExpanded) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      Keyboard.dismiss();
    }
  }, [searchExpanded]);

  const handleOpenAdd = () => {
    router.push('/super-admin/subscription-plans/add-plan');
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    router.push({
      pathname: '/super-admin/subscription-plans/edit-plan',
      params: {
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        price: String(plan.price),
        amcPrice: String(plan.amc_price),
        durationDays: String(plan.duration_days),
        isActive: String(plan.is_active),
      },
    });
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
            <Menu
              visible={layoutMenuOpen}
              onDismiss={() => setLayoutMenuOpen(false)}
              anchor={
                <AppbarActionIcon
                  icon={viewMode === 'table' ? 'table-large' : 'format-list-bulleted'}
                  onPress={() => setLayoutMenuOpen(true)}
                  theme={theme}
                />
              }
            >
              <Menu.Item
                leadingIcon="format-list-bulleted"
                title="List"
                onPress={() => {
                  setViewMode('list');
                  setLayoutMenuOpen(false);
                }}
              />
              <Menu.Item
                leadingIcon="table-large"
                title="Table"
                onPress={() => {
                  setViewMode('table');
                  setLayoutMenuOpen(false);
                }}
              />
            </Menu>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              <FlatList
                ref={listRef}
                onScroll={handleScroll}
                scrollEventThrottle={16}
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
                  <View style={styles.emptyContainer}>
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
            ref={listRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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

      {showScrollTop && (
        <View style={styles.scrollTopContainer}>
          <FAB
            icon="chevron-up"
            style={styles.scrollTopFab}
            customSize={40}
            color={theme.colors.onSurface}
            onPress={scrollToTop}
          />
        </View>
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
        color={theme.colors.onSecondary}
        onPress={handleOpenAdd}
      />
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
      <MaterialCommunityIcons name={icon as any} size={24} color={theme.colors.primary} />
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
    // Table styling
    tableContainer: {
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      overflow: 'hidden',
      marginBottom: 20,
      minWidth: 900,
      flex: 1,
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
    cellId: { width: 50 },
    cellName: { width: 180, flexGrow: 1 },
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
    listCard: {
      flex: 1,
      margin: 16,
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
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
      right: 24,
      bottom: 80,
      borderRadius: 12,
    },
    scrollTopContainer: {
      position: 'absolute',
      bottom: 80,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 99,
    },
    scrollTopFab: {
      backgroundColor: theme.dark ? 'rgba(30, 31, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)',
      borderRadius: 20,
      elevation: 3,
    },
  });
