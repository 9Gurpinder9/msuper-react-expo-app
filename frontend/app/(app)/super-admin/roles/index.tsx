// frontend/app/(app)/super-admin/roles/index.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Keyboard } from 'react-native';
import {
  Text,
  Button,
  FAB,
  Searchbar,
  useTheme,
  Avatar,
  Appbar,
  ActivityIndicator,
  MD3Theme,
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

type RoleItem = {
  id: string;
  uuid: string;
  name: string;
  is_active: boolean;
};

export default function RolesRegistry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError } = useToast();

  const [roles, setRoles] = useState<RoleItem[]>([]);
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

  const fetchRoles = async (query = '', pageNum = 1, isLoadMore = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const baseUrl = `${API_BASE_URL}/super-admin/roles`;
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
          setRoles((prev) => [...prev, ...newItems]);
        } else {
          setRoles(newItems);
        }
        setTotalRecords(response.data.pagination?.total || 0);
        setHasMore(response.data.pagination?.has_more ?? false);
        setPage(pageNum);
      } else {
        showError(response.data?.message || 'Failed to load roles');
      }
    } catch {
      showError('Network error loading roles');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchRoles(search, page + 1, true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchRoles(search, 1, false);
    }, [search])
  );

  useEffect(() => {
    if (searchExpanded) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      Keyboard.dismiss();
    }
  }, [searchExpanded]);

  const handleOpenAdd = () => {
    router.push('/super-admin/roles/add-role');
  };

  const handleOpenEdit = (item: RoleItem) => {
    router.push(`/super-admin/roles/edit-role?roleId=${item.id}`);
  };

  function renderTableHeader() {
    return (
      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, styles.cellId]}>
          <Text style={styles.headerText}>ID</Text>
        </View>
        <View style={[styles.headerCell, styles.cellName]}>
          <Text style={styles.headerText}>Role Name</Text>
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

  function renderTableItem({ item, index }: { item: RoleItem; index: number }) {
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellId]}>
          <Text style={styles.cellText}>{index + 1}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellName]}>
          <Text style={styles.roleName}>{item.name}</Text>
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
            testID={`edit-role-button-${index}`}
          >
            Edit
          </Button>
        </View>
      </View>
    );
  }

  function renderListItem({ item, index }: { item: RoleItem; index: number }) {
    const isLast = index === roles.length - 1;
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
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
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
            testID={`edit-role-button-${index}`}
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
        title="Roles"
        showBack
        onBackPress={() => router.back()}
        actions={
          <>
            <Appbar.Action
              icon="magnify"
              color={theme.colors.primary}
              onPress={() => setSearchExpanded(!searchExpanded)}
            />
            <Menu
              visible={layoutMenuOpen}
              onDismiss={() => setLayoutMenuOpen(false)}
              anchor={
                <Appbar.Action
                  icon={viewMode === 'table' ? 'table-large' : 'format-list-bulleted'}
                  color={theme.colors.primary}
                  onPress={() => setLayoutMenuOpen(true)}
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
          </>
        }
      />

      {(searchExpanded || search.trim() !== '') && (
        <View style={styles.headerBar}>
          <Searchbar
            ref={searchRef}
            placeholder="Search by role name..."
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
        <AppLoader message="Loading roles..." icon="database-sync-outline" />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              <FlatList
                ref={listRef}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                data={roles}
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
                    <MaterialCommunityIcons name="earth-off" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                    <Text variant="bodyLarge" style={styles.emptyText}>
                      No roles registered yet.
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
            data={roles}
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
                  No roles registered yet.
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
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
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
    tableContainer: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      flex: 1,
      minWidth: 440,
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
    roleName: {
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
      right: 24,
      bottom: 24,
      borderRadius: 12,
    },
    scrollTopContainer: {
      position: 'absolute',
      bottom: 24,
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
    cellId: { width: 50 },
    cellName: { width: 180, flexGrow: 1 },
    cellStatus: { width: 100 },
    cellAction: { width: 110 },
  });
