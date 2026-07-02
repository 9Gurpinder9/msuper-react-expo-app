// frontend/app/(app)/super-admin/companies/index.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, Keyboard } from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  FAB,
  Searchbar,
  useTheme,
  Avatar,
  Appbar,
  MD3Theme,
  IconButton,
  Menu,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';
import { formatDate } from '@utils/dateFormatter';

  type Company = {
  id: string;
  uuid: string;
  name: string;
  owner_name: string;
  email: string;
  mobile1: string;
  category_name: string;
  plan_id: string;
  is_active: boolean;
  expiry_date: string;
  email_verified: boolean;
};

export default function CompaniesRegistry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
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
  const [activeMenuCompanyId, setActiveMenuCompanyId] = useState<string | null>(null);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const fetchCompanies = async (query = '', pageNum = 1, isLoadMore = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const baseUrl = `${API_BASE_URL}/super-admin/companies`;
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
          setCompanies((prev) => [...prev, ...newItems]);
        } else {
          setCompanies(newItems);
        }
        setTotalRecords(response.data.pagination?.total || 0);
        setHasMore(response.data.pagination?.has_more ?? false);
        setPage(pageNum);
      } else {
        showError(response.data?.message || 'Failed to load companies');
      }
    } catch {
      showError('Network error loading companies');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchCompanies(search, page + 1, true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchCompanies(search, 1, false);
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
    router.push('/super-admin/companies/add-company');
  };

  const handleOpenEdit = (item: Company) => {
    router.push(`/super-admin/companies/edit-company?companyId=${item.id}`);
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Companies"
        showBack
        onBackPress={() => router.back()}
        actions={
          <>
            <Appbar.Action
              icon="magnify"
              color={theme.colors.primary}
              onPress={() => setSearchExpanded(!searchExpanded)}
              testID="search-toggle-button"
              accessibilityLabel="search-toggle-button"
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
            placeholder="Search by company, owner, or email..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchbar}
            inputStyle={{ minHeight: 0 }}
            iconColor={theme.colors.onSurfaceVariant}
            testID="companies-searchbar"
          />
        </View>
      )}

      <View style={styles.subHeader}>
        <Text variant="bodySmall" style={styles.totalText}>
          Total records: {totalRecords}
        </Text>
      </View>

      {loading ? (
        <AppLoader message="Loading companies..." icon="database-sync-outline" />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              <FlatList
                ref={listRef}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                data={companies}
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
                    <MaterialCommunityIcons name="office-building" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                    <Text variant="bodyLarge" style={styles.emptyText}>
                      No companies registered yet.
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
            data={companies}
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
                <MaterialCommunityIcons name="office-building" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No companies registered yet.
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
        testID="add-company-fab"
      />
    </View>
  );

  function renderTableHeader() {
    return (
      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, styles.cellId]}>
          <Text style={styles.headerText}>ID</Text>
        </View>
        <View style={[styles.headerCell, styles.cellCompany]}>
          <Text style={styles.headerText}>Company Name</Text>
        </View>
        <View style={[styles.headerCell, styles.cellOwner]}>
          <Text style={styles.headerText}>Owner</Text>
        </View>
        <View style={[styles.headerCell, styles.cellEmail]}>
          <Text style={styles.headerText}>Email</Text>
        </View>
        <View style={[styles.headerCell, styles.cellCategory]}>
          <Text style={styles.headerText}>Category</Text>
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

  function renderTableItem({ item, index }: { item: Company; index: number }) {
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellId]}>
          <Text style={styles.cellText}>{index + 1}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCompany]}>
          <Text style={styles.companyName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellOwner]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.owner_name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellEmail]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCategory]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.category_name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellStatus]}>
          <Text style={[styles.statusText, { color: item.is_active ? theme.colors.primary : theme.colors.error }]}>
            {item.is_active ? 'ACTIVE' : 'DISABLED'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.cellAction, { borderRightWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }]}>
          <Button
            mode={theme.dark ? 'contained-tonal' : 'outlined'}
            buttonColor={theme.dark ? theme.colors.primaryContainer : undefined}
            textColor={theme.dark ? theme.colors.onPrimaryContainer : theme.colors.primary}
            compact
            onPress={() => handleOpenEdit(item)}
            style={styles.editBtn}
            labelStyle={styles.editBtnLabel}
            testID={`edit-company-button-${index}`}
          >
            Edit
          </Button>

          <Button
            mode="outlined"
            compact
            onPress={() => router.push(`/super-admin/companies/menu-permissions?companyId=${item.id}`)}
            style={[styles.editBtn, { borderColor: theme.colors.secondary }]}
            labelStyle={[styles.editBtnLabel, { color: theme.colors.secondary }]}
            testID={`menu-permissions-company-button-${index}`}
          >
            Menus
          </Button>

          <Button
            mode="outlined"
            compact
            onPress={() => router.push(`/super-admin/companies/company-users?companyId=${item.id}`)}
            style={[styles.editBtn, { borderColor: theme.colors.tertiary || theme.colors.primary }]}
            labelStyle={[styles.editBtnLabel, { color: theme.colors.tertiary || theme.colors.primary }]}
            testID={`users-company-button-${index}`}
          >
            Users
          </Button>
        </View>
      </View>
    );
  }

  function renderListItem({ item, index }: { item: Company; index: number }) {
    const isLast = index === companies.length - 1;
    const formattedExpiry = formatDate(item.expiry_date);
    return (
      <View style={[styles.listItem, isLast && styles.listItemLast]}>
        <Avatar.Icon
          size={36}
          icon="office-building"
          style={{ backgroundColor: theme.colors.secondaryContainer }}
          color={theme.colors.onSecondaryContainer}
        />
        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Owner: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.owner_name}</Text> | Category: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.category_name}</Text>
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Email: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.email}</Text> | Expiry: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{formattedExpiry}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 2, alignItems: 'center' }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Status: <Text style={{ fontWeight: '700', color: item.is_active ? theme.colors.primary : theme.colors.error }}>{item.is_active ? 'ACTIVE' : 'DISABLED'}</Text>
            </Text>
          </View>
        </View>
        <View style={[styles.listRightCol, { justifyContent: 'center', alignItems: 'center' }]}>
          <Menu
            visible={activeMenuCompanyId === item.id}
            onDismiss={() => setActiveMenuCompanyId(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setActiveMenuCompanyId(item.id)}
                iconColor={theme.colors.onSurfaceVariant}
                style={{ margin: 0 }}
                testID={`company-menu-button-${index}`}
              />
            }
          >
            <Menu.Item
              leadingIcon="pencil-outline"
              title="Edit"
              onPress={() => {
                setActiveMenuCompanyId(null);
                handleOpenEdit(item);
              }}
              testID={`edit-company-item-${index}`}
            />
            <Menu.Item
              leadingIcon="shield-key-outline"
              title="Edit Menu Permissions"
              onPress={() => {
                setActiveMenuCompanyId(null);
                router.push(`/super-admin/companies/menu-permissions?companyId=${item.id}`);
              }}
              testID={`edit-permissions-item-${index}`}
            />
            <Menu.Item
              leadingIcon="account-multiple-outline"
              title="Company Users"
              onPress={() => {
                setActiveMenuCompanyId(null);
                router.push(`/super-admin/companies/company-users?companyId=${item.id}`);
              }}
              testID={`company-users-item-${index}`}
            />
          </Menu>
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
    // Table View
    tableContainer: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      flex: 1,
      minWidth: 1020,
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
      width: 50,
    },
    cellCompany: {
      width: 170,
      flexGrow: 1,
    },
    cellOwner: {
      width: 120,
    },
    cellEmail: {
      width: 170,
      flexGrow: 1,
    },
    cellCategory: {
      width: 120,
    },
    cellStatus: {
      width: 110,
    },
    cellAction: {
      width: 220,
    },
    companyName: {
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
  });
