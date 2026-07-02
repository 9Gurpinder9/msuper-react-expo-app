// frontend/app/(app)/company/categories/index.tsx
import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  Button,
  useTheme,
  ActivityIndicator,
  FAB,
  Searchbar,
  Appbar,
  Avatar,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';

import TopAppBar from '@company/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import type { AppTheme } from '../../../../src/theme/types';
import type { Category } from '../../../../src/features/bookmarks/types';
import { listCategories } from '../../../../src/features/bookmarks/categories.api';
import { useToast } from '../../../../src/utils/toast';

export default function CompanyCategories() {
  const theme = useTheme<AppTheme>();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError } = useToast();
  const listRef = useRef<FlatList<Category>>(null);
  const searchRef = useRef<React.ComponentRef<typeof Searchbar>>(null);

  const [searchExpanded, setSearchExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['bookmark-categories', search],
    queryFn: ({ pageParam }) =>
      listCategories({ limit: 20, offset: pageParam, query: search || undefined }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const categories = React.useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.total ?? categories.length;
  const showEndMessage = totalCount > 20 && categories.length > 0 && !hasNextPage;

  const toggleSearch = () => {
    setSearchExpanded((prev) => {
      const next = !prev;
      if (!next) {
        setSearch('');
        refetch();
      } else {
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      return next;
    });
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, styles.cellNo]}>
        <Text style={styles.headerText}>Sr.</Text>
      </View>
      <View style={[styles.headerCell, styles.cellName]}>
        <Text style={styles.headerText}>Category Name</Text>
      </View>
      <View style={[styles.headerCell, styles.cellActionT, { borderRightWidth: 0, alignItems: 'center' }]}>
        <Text style={styles.headerText}>Action</Text>
      </View>
    </View>
  );

  const renderTableItem = ({ item, index }: { item: Category; index: number }) => (
    <View style={styles.tableRow}>
      <View style={[styles.tableCell, styles.cellNo]}>
        <Text style={styles.cellText}>{index + 1}</Text>
      </View>
      <View style={[styles.tableCell, styles.cellName]}>
        <Text style={styles.countryName} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={[styles.tableCell, styles.cellActionT, { borderRightWidth: 0, alignItems: 'center' }]}>
        <Button
          mode={theme.dark ? 'contained-tonal' : 'outlined'}
          buttonColor={theme.dark ? theme.colors.primaryContainer : undefined}
          textColor={theme.dark ? theme.colors.onPrimaryContainer : theme.colors.primary}
          compact
          onPress={() => router.push({ pathname: '/company/categories/edit-category', params: { id: item.id, name: item.name } })}
          style={styles.editBtn}
          labelStyle={styles.editBtnLabel}
        >
          Edit
        </Button>
      </View>
    </View>
  );

  const renderListItem = ({ item, index }: { item: Category; index: number }) => {
    const isLast = index === categories.length - 1;
    return (
      <View style={[styles.listItem, isLast && styles.listItemLast]}>
        <Avatar.Text
          size={36}
          label={item.name.substring(0, 2).toUpperCase()}
          style={{ backgroundColor: theme.colors.secondaryContainer }}
          labelStyle={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {item.name}
          </Text>
        </View>
        <View style={styles.listRightCol}>
          <Button
            mode={theme.dark ? 'contained-tonal' : 'outlined'}
            buttonColor={theme.dark ? theme.colors.primaryContainer : undefined}
            textColor={theme.dark ? theme.colors.onPrimaryContainer : theme.colors.primary}
            compact
            onPress={() => router.push({ pathname: '/company/categories/edit-category', params: { id: item.id, name: item.name } })}
            style={styles.editBtn}
            labelStyle={styles.editBtnLabel}
          >
            Edit
          </Button>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Categories"
        showBack
        onBackPress={() => router.back()}
        actions={
          <>
            <Appbar.Action
              icon="magnify"
              color={theme.colors.primary}
              onPress={toggleSearch}
            />
            <Appbar.Action
              icon={viewMode === 'table' ? 'format-list-bulleted' : 'table-large'}
              color={theme.colors.primary}
              onPress={() => setViewMode(viewMode === 'table' ? 'list' : 'table')}
            />
          </>
        }
      />

      {(searchExpanded || search.trim() !== '') && (
        <View style={styles.headerBar}>
          <Searchbar
            ref={searchRef}
            placeholder="Search categories..."
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
          Total records: {totalCount}
        </Text>
      </View>

      {isLoading ? (
        <AppLoader message="Loading categories..." icon="database-sync-outline" />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={styles.tableContainer}>
            {renderTableHeader()}
            <FlatList
              ref={listRef}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              data={categories}
              keyExtractor={(item) => item.id}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) fetchNextPage();
              }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="shape-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    No categories found.
                  </Text>
                </View>
              }
              renderItem={renderTableItem}
            />
          </View>
        </View>
      ) : (
        <View style={styles.listCard}>
          <FlatList
            ref={listRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              categories.length > 0 ? (
                <View style={styles.footerContainer}>
                  {isFetchingNextPage ? (
                    <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
                  ) : hasNextPage ? null : showEndMessage ? (
                    <Text style={styles.footerText}>You have reached the end.</Text>
                  ) : null}
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="shape-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No categories found.
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
        onPress={() => router.push('/company/categories/add-category')}
        testID="add-category-fab"
      />
    </View>
  );
}

const makeStyles = (theme: AppTheme) => {
  const isDark = theme.dark;
  return StyleSheet.create({
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
      backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
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
    tableContainer: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
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
    cellNo: {
      width: 60,
    },
    cellName: {
      flex: 1,
    },
    cellActionT: {
      width: 120,
    },
    countryName: {
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
      backgroundColor: isDark ? 'rgba(30, 31, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)',
      borderRadius: 20,
      elevation: 3,
    },
    footerContainer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    footerText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
  });
};
