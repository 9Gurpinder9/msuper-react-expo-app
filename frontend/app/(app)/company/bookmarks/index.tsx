// frontend/app/(app)/company/bookmarks/index.tsx
import React from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  IconButton,
  Menu,
  Surface,
  Text,
  useTheme,
  Searchbar,
  Appbar,
  FAB,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import TopAppBar from '@company/components/TopAppBar';
import { useToast } from '@utils/toast';
import type { AppTheme } from '../../../../src/theme/types';
import type { Bookmark, Category } from '../../../../src/features/bookmarks/types';
import { listBookmarks, updateBookmark } from '../../../../src/features/bookmarks/api';
import { listCategories } from '../../../../src/features/bookmarks/categories.api';

type ViewMode = 'card' | 'table';
type MenuKey = 'all' | 'favorites' | 'categories' | 'tags' | 'recent' | 'trash' | 'settings';

const MENU_ITEMS: Array<{ key: MenuKey; label: string; icon: string }> = [
  { key: 'all', label: 'Dashboard', icon: 'view-grid-outline' },
  { key: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { key: 'tags', label: 'Tags', icon: 'tag-outline' },
  { key: 'recent', label: 'Today', icon: 'clock-outline' },
];

export default function CompanyBookmarks() {
  const theme = useTheme<AppTheme>();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess, showInfo } = useToast();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  const [viewMode, setViewMode] = React.useState<ViewMode>('card');
  const [searchExpanded, setSearchExpanded] = React.useState(false);
  const [pendingSearch, setPendingSearch] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState('');
  const [activeMenu, setActiveMenu] = React.useState<MenuKey>('all');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [layoutMenuOpen, setLayoutMenuOpen] = React.useState(false);
  const [actionMenuId, setActionMenuId] = React.useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const searchRef = React.useRef<React.ComponentRef<typeof Searchbar>>(null);
  const listRef = React.useRef<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('company.bookmarks.view');
        if (saved === 'card' || saved === 'table') {
          setViewMode(saved);
        }
      } catch {}
    })();
  }, []);

  React.useEffect(() => {
    if (searchExpanded) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      Keyboard.dismiss();
    }
  }, [searchExpanded]);

  React.useEffect(() => {
    AsyncStorage.setItem('company.bookmarks.view', viewMode).catch(() => {});
  }, [viewMode]);

  const filters = React.useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      favorite: activeMenu === 'favorites',
      category_id: selectedCategoryId || undefined,
      tag: selectedTag || undefined,
      deleted: activeMenu === 'trash',
    }),
    [appliedSearch, activeMenu, selectedCategoryId, selectedTag]
  );

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['bookmarks', filters],
    queryFn: () => listBookmarks(filters),
    placeholderData: (prev) => prev,
  });

  const { data: categoryData } = useQuery({
    queryKey: ['bookmark-categories'],
    queryFn: () => listCategories({ limit: 200, offset: 0 }),
  });

  const bookmarks = data?.data ?? [];
  const totalCount = data?.count ?? 0;

  const categories = React.useMemo(() => categoryData?.data ?? [], [categoryData]);

  const tags = React.useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach((b) => b.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [bookmarks]);

  const recentCutoff = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);

  const visibleBookmarks = React.useMemo(() => {
    const base =
      activeMenu === 'recent'
        ? bookmarks.filter((b) => new Date(b.created_at).getTime() >= recentCutoff)
        : activeMenu === 'tags'
          ? bookmarks.filter((b) => (b.tags ?? []).length > 0)
          : bookmarks;
    const needle = appliedSearch.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((b) => {
      const categoryName =
        categories.find((c) => c.id === b.category_id)?.name?.toLowerCase() || '';
      return (
        b.title?.toLowerCase().includes(needle) ||
        b.url?.toLowerCase().includes(needle) ||
        b.description?.toLowerCase().includes(needle) ||
        categoryName.includes(needle)
      );
    });
  }, [activeMenu, appliedSearch, bookmarks, categories, recentCutoff]);

  const cursorPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {};
  const columns = viewMode === 'card' ? (width >= 1200 ? 5 : width >= 768 ? 4 : 1) : 1;
  const gap = 12;
  const itemWidth =
    viewMode === 'card' && columns > 1 ? (width - 32 - (columns - 1) * gap) / columns : width - 32;

  const handleCopy = async (url: string) => {
    const clipboard = (globalThis as any)?.navigator?.clipboard;
    if (Platform.OS === 'web' && clipboard?.writeText) {
      await clipboard.writeText(url);
      showSuccess('Link copied');
      return;
    }
    showInfo('Copy is available on web for now');
  };

  const handleToggleFavorite = async (bookmark: Bookmark) => {
    try {
      await updateBookmark(bookmark.id, { is_favorite: !bookmark.is_favorite });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      showSuccess(bookmark.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (err: any) {
      showError(err?.message || 'Failed to update');
    }
  };

  const toggleSearch = () => {
    setSearchExpanded((prev) => {
      const next = !prev;
      if (!next) {
        setPendingSearch('');
        setAppliedSearch('');
      }
      return next;
    });
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    const ref = listRef.current;
    if (!ref) return;
    if ('scrollToOffset' in ref) {
      (ref as any).scrollToOffset({ offset: 0, animated: true });
    } else {
      (ref as any).scrollTo({ y: 0, animated: true });
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Bookmarks"
        showBack
        onBackPress={() => router.back()}
        actions={
          <>
            <Appbar.Action
              accessibilityLabel="Toggle search"
              icon="magnify"
              color={theme.colors.primary}
              onPress={toggleSearch}
            />
            <Appbar.Action
              accessibilityLabel="Manage Categories"
              icon="folder-cog-outline"
              color={theme.colors.primary}
              onPress={() => router.push('/company/bookmark-categories')}
            />
            <Menu
              visible={layoutMenuOpen}
              onDismiss={() => setLayoutMenuOpen(false)}
              anchor={
                <Appbar.Action
                  accessibilityLabel="Switch layout view"
                  icon={viewMode === 'table' ? 'format-list-bulleted' : 'table-large'}
                  color={theme.colors.primary}
                  onPress={() => setLayoutMenuOpen(true)}
                />
              }
              contentStyle={styles.menuContent}
            >
              <Menu.Item
                leadingIcon="format-list-bulleted"
                title="Card"
                onPress={() => {
                  setViewMode('card');
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

      {(searchExpanded || appliedSearch.trim() !== '') && (
        <View style={styles.headerBar}>
          <Searchbar
            ref={searchRef}
            placeholder="Search bookmarks, categories, URLs"
            onChangeText={setPendingSearch}
            value={pendingSearch}
            onSubmitEditing={() => setAppliedSearch(pendingSearch.trim())}
            onIconPress={() => setAppliedSearch(pendingSearch.trim())}
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
        {appliedSearch.trim() ? (
          <Text variant="bodySmall" style={styles.totalText}>
            Showing {visibleBookmarks.length} of {totalCount} results
          </Text>
        ) : null}
      </View>

      <View style={styles.navFilterRow}>
        {MENU_ITEMS.map((item) => {
          const isActive = activeMenu === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.navChip, isActive && styles.navChipActive, cursorPointer]}
              onPress={() => {
                setActiveMenu(item.key);
                setSelectedCategoryId(null);
                setSelectedTag(null);
                refetch();
              }}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={14}
                color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.navChipText, isActive && styles.navChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {viewMode === 'table' ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, styles.colTitle]}>Title</Text>
              <Text style={[styles.tableHeaderText, styles.colActions]}>Actions</Text>
            </View>
            <FlatList
              ref={listRef}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              data={visibleBookmarks}
              keyExtractor={(item) => item.id}
              refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name="bookmark-outline"
                    size={52}
                    color={theme.colors.primary}
                    style={{ opacity: 0.35 }}
                  />
                  <Text variant="bodyLarge" style={[styles.emptyText, { fontWeight: '700' }]}>
                    No bookmarks yet
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.emptyText, { opacity: 0.7, marginTop: 4 }]}
                  >
                    {appliedSearch.trim()
                      ? `No results for "${appliedSearch}"`
                      : 'Tap + to add your first bookmark'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <BookmarkCard
                  bookmark={item}
                  theme={theme}
                  viewMode={viewMode}
                  onOpen={() => Linking.openURL(item.url)}
                  onCopy={() => handleCopy(item.url)}
                  onEdit={() =>
                    router.push({
                      pathname: '/company/bookmarks/edit-bookmark',
                      params: {
                        id: item.id,
                        title: item.title,
                        url: item.url,
                        description: item.description || '',
                        category_id: item.category_id || '',
                        tags: (item.tags || []).join(','),
                        is_favorite: String(item.is_favorite),
                        thumbnail_url: item.thumbnail_url || '',
                        favicon_url: item.favicon_url || '',
                        og_title: item.og_title || '',
                        og_description: item.og_description || '',
                        og_image: item.og_image || '',
                      },
                    })
                  }
                  onToggleFavorite={() => handleToggleFavorite(item)}
                  categoryName={categories.find((c) => c.id === item.category_id)?.name}
                  actionMenuId={actionMenuId}
                  setActionMenuId={setActionMenuId}
                />
              )}
            />
          </View>
        </View>
      ) : (
        <View style={styles.cardListContainer}>
          <ScrollView
            ref={listRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={[
              styles.listContent,
              { flexDirection: 'row', flexWrap: 'wrap', gap },
            ]}
            style={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
          >
            {visibleBookmarks.length === 0 ? (
              <View style={[styles.emptyContainer, { width: '100%' }]}>
                <MaterialCommunityIcons
                  name="bookmark-outline"
                  size={52}
                  color={theme.colors.primary}
                  style={{ opacity: 0.35 }}
                />
                <Text variant="bodyLarge" style={[styles.emptyText, { fontWeight: '700' }]}>
                  No bookmarks yet
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.emptyText, { opacity: 0.7, marginTop: 4 }]}
                >
                  {appliedSearch.trim()
                    ? `No results for "${appliedSearch}"`
                    : 'Tap + to add your first bookmark'}
                </Text>
              </View>
            ) : (
              visibleBookmarks.map((item) => (
                <View key={item.id} style={{ width: itemWidth }}>
                  <BookmarkCard
                    bookmark={item}
                    theme={theme}
                    viewMode={viewMode}
                    onOpen={() => Linking.openURL(item.url)}
                    onCopy={() => handleCopy(item.url)}
                    onEdit={() =>
                      router.push({
                        pathname: '/company/bookmarks/edit-bookmark',
                        params: {
                          id: item.id,
                          title: item.title,
                          url: item.url,
                          description: item.description || '',
                          category_id: item.category_id || '',
                          tags: (item.tags || []).join(','),
                          is_favorite: String(item.is_favorite),
                          thumbnail_url: item.thumbnail_url || '',
                          favicon_url: item.favicon_url || '',
                          og_title: item.og_title || '',
                          og_description: item.og_description || '',
                          og_image: item.og_image || '',
                        },
                      })
                    }
                    onToggleFavorite={() => handleToggleFavorite(item)}
                    categoryName={categories.find((c) => c.id === item.category_id)?.name}
                    actionMenuId={actionMenuId}
                    setActionMenuId={setActionMenuId}
                  />
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {showScrollTop && (
        <View style={styles.scrollTopContainer}>
          <FAB
            accessibilityLabel="Scroll to top"
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
        onPress={() => router.push('/company/bookmarks/add-bookmark')}
        testID="add-bookmark-fab"
      />
    </View>
  );
}

function BookmarkCard({
  bookmark,
  theme,
  viewMode,
  onOpen,
  onCopy,
  onEdit,
  onToggleFavorite,
  categoryName,
  actionMenuId,
  setActionMenuId,
}: {
  bookmark: Bookmark;
  theme: AppTheme;
  viewMode: ViewMode;
  onOpen: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  categoryName?: string;
  actionMenuId: string | null;
  setActionMenuId: (id: string | null) => void;
}) {
  const isTable = viewMode === 'table';
  const [hovered, setHovered] = React.useState(false);
  const menuVisible = actionMenuId === bookmark.id;
  const previewUrl = bookmark.thumbnail_url || bookmark.og_image || bookmark.favicon_url || '';

  const actionMenu = (
    <Menu
      visible={menuVisible}
      onDismiss={() => setActionMenuId(null)}
      anchor={
        <IconButton
          accessibilityLabel="More actions"
          icon="dots-vertical"
          size={20}
          onPress={() => setActionMenuId(bookmark.id)}
          iconColor={theme.colors.onSurfaceVariant}
        />
      }
    >
      <Menu.Item
        leadingIcon={bookmark.is_favorite ? 'star' : 'star-outline'}
        title={bookmark.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
        onPress={() => {
          setActionMenuId(null);
          onToggleFavorite();
        }}
      />
      <Menu.Item
        leadingIcon="open-in-new"
        title="Open Link"
        onPress={() => {
          setActionMenuId(null);
          onOpen();
        }}
      />
      <Menu.Item
        leadingIcon="content-copy"
        title="Copy"
        onPress={() => {
          setActionMenuId(null);
          onCopy();
        }}
      />
      <Menu.Item
        leadingIcon="pencil-outline"
        title="Edit"
        onPress={() => {
          setActionMenuId(null);
          onEdit();
        }}
      />
    </Menu>
  );

  if (isTable) {
    return (
      <TableRow
        bookmark={bookmark}
        theme={theme}
        previewUrl={previewUrl}
        categoryName={categoryName}
        actionMenu={actionMenu}
        onToggleFavorite={onToggleFavorite}
        stylesTable={stylesTable}
      />
    );
  }

  return (
    <Surface
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        stylesCard.card,
        {
          backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'transparent',
          transform: [{ scale: hovered ? 1.02 : 1 }],
          ...(Platform.OS === 'web' ? { transition: 'box-shadow 0.25s ease, transform 0.25s ease' } : {}),
        },
      ]}
      elevation={hovered ? 5 : 1}
    >
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={stylesCard.header}>
          <View style={stylesCard.titleRow}>
            <Text variant="titleMedium" numberOfLines={1} style={stylesCard.title}>
              {bookmark.title}
            </Text>
            {!!categoryName && (
              <View style={{ marginLeft: 6 }}>
                <CategoryBadge label={categoryName} />
              </View>
            )}
          </View>
          <View style={stylesCard.headerActions}>
            {actionMenu}
          </View>
        </View>

        <View style={{ position: 'relative', marginBottom: 12 }}>
          {previewUrl ? (
            <Image source={{ uri: previewUrl }} style={stylesCard.preview} resizeMode="cover" />
          ) : (
            <View style={[stylesCard.preview, stylesCard.previewFallback]}>
              <MaterialCommunityIcons name="web" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12 }} />
        </View>

        <Pressable onPress={onOpen} style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}>
          <Text
            style={[stylesCard.url, { color: theme.colors.primary, textDecorationLine: 'underline' }]}
            numberOfLines={1}
          >
            {bookmark.url}
          </Text>
        </Pressable>

        <View style={stylesCard.metaRow}>
          {(bookmark.tags || []).slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={[stylesCard.metaChip, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <Text style={{ fontSize: 8, letterSpacing: 0.3, opacity: 0.75 }}>#{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Surface>
  );
}

function TableRow({
  bookmark,
  theme,
  previewUrl,
  categoryName,
  actionMenu,
  onToggleFavorite,
  stylesTable,
}: {
  bookmark: Bookmark;
  theme: AppTheme;
  previewUrl: string;
  categoryName?: string;
  actionMenu: React.ReactNode;
  onToggleFavorite: () => void;
  stylesTable: any;
}) {
  const [rowHovered, setRowHovered] = React.useState(false);
  return (
    <View
      onPointerEnter={() => setRowHovered(true)}
      onPointerLeave={() => setRowHovered(false)}
      style={[
        stylesTable.row,
        { borderColor: theme.colors.outlineVariant },
        rowHovered && { backgroundColor: theme.colors.surfaceVariant + '80' },
      ]}
    >
      <View style={stylesTable.colTitle}>
        <View style={stylesTable.titleRow}>
          {previewUrl ? (
            <Image source={{ uri: previewUrl }} style={stylesTable.preview} resizeMode="cover" />
          ) : (
            <View style={stylesTable.previewFallback}>
              <MaterialCommunityIcons name="web" size={12} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
          <View style={stylesTable.titleTextWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={stylesTable.title} numberOfLines={1}>
                {bookmark.title}
              </Text>
              {!!categoryName && <CategoryBadge label={categoryName} />}
            </View>
            <Text style={stylesTable.url} numberOfLines={1}>
              {bookmark.url}
            </Text>
          </View>
        </View>
      </View>
      <View style={stylesTable.colActions}>
        {actionMenu}
      </View>
    </View>
  );
}

function CategoryBadge({ label }: { label: string }) {
  const theme = useTheme<AppTheme>();
  return (
    <View style={[stylesBadge.pill, { backgroundColor: theme.colors.secondaryContainer }]}>
      <Text
        numberOfLines={1}
        style={[stylesBadge.pillText, { color: theme.colors.onSecondaryContainer }]}
      >
        {label}
      </Text>
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
    navFilterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    navChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceVariant,
    },
    navChipActive: {
      backgroundColor: theme.colors.primaryContainer,
    },
    navChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
    },
    navChipTextActive: {
      color: theme.colors.primary,
    },
    menuContent: {
      borderRadius: 14,
      paddingVertical: 6,
    },
    cardListContainer: {
      flex: 1,
      padding: 4,
    },
    columnWrap: {
      gap: 12,
    },
    listContent: {
      paddingBottom: 80,
    },
    tableContainer: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    tableHeaderText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
      textTransform: 'uppercase',
    },
    colTitle: {
      flex: 1,
    },
    colCategory: {
      width: 130,
    },
    colActions: {
      width: 120,
      textAlign: 'right',
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
  });
};

const stylesCard = StyleSheet.create({
  card: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  // To manually increase thumbnail height, change the `height` value below (currently 120)
  preview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  previewFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  url: {
    fontSize: 12,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  metaChip: {
    height: 18,
    borderRadius: 3,
    opacity: 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
});

const stylesTable = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colTitle: {
    width: '55%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleTextWrap: {
    flex: 1,
  },
  preview: {
    width: 26,
    height: 26,
    borderRadius: 4,
  },
  previewFallback: {
    width: 26,
    height: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colActions: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  title: {
    fontWeight: '600',
    fontSize: 13,
  },
  url: {
    fontSize: 11,
    opacity: 0.7,
  },
  muted: {
    opacity: 0.6,
    fontSize: 12,
  },
});

const stylesBadge = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 1,
    paddingHorizontal: 8,
    maxWidth: '100%',
  },
  pillText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
});
