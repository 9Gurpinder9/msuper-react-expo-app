// frontend/app/(app)/company/bookmarks.tsx
import React from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Button,
  Chip,
  IconButton,
  Menu,
  Modal,
  Portal,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '../../../src/utils/toast';
import type { AppTheme } from '../../../src/theme/types';
import type {
  Bookmark,
  BookmarkInput,
  BookmarkUpdateInput,
  Category,
} from '../../../src/features/bookmarks/types';
import {
  createBookmark,
  deleteBookmark,
  listBookmarks,
  updateBookmark,
} from '../../../src/features/bookmarks/api';
import { listCategories } from '../../../src/features/bookmarks/categories.api';

type ViewMode = 'card' | 'list' | 'table';
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
  const [showSearch, setShowSearch] = React.useState(false);
  const [pendingSearch, setPendingSearch] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState('');
  const [activeMenu, setActiveMenu] = React.useState<MenuKey>('all');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorDraft, setEditorDraft] = React.useState<Bookmark | null>(null);
  const [navMenuOpen, setNavMenuOpen] = React.useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = React.useState(false);
  const [actionMenuId, setActionMenuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('company.bookmarks.view');
        if (saved === 'card' || saved === 'list' || saved === 'table') {
          setViewMode(saved);
        }
      } catch {}
    })();
  }, []);

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

  const createMutation = useMutation({
    mutationFn: createBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      showSuccess('Bookmark added');
    },
    onError: (err: any) => showError(err?.message || 'Failed to create bookmark'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BookmarkUpdateInput }) =>
      updateBookmark(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      showSuccess('Bookmark updated');
    },
    onError: (err: any) => showError(err?.message || 'Failed to update bookmark'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      showInfo('Moved to trash');
    },
    onError: (err: any) => showError(err?.message || 'Failed to delete bookmark'),
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

  const columns = viewMode === 'card' ? (width >= 1300 ? 2 : 1) : 1;
  const isDark = theme.dark;
  const cardBg = isDark ? '#142a49' : theme.colors.surface;
  const pageBg = isDark ? '#0b1530' : '#fff4ec';
  const chipBg = isDark ? '#0f6d8a' : '#e6f6fb';
  const chipTextColor = isDark ? '#9be8ff' : '#197aa0';
  const iconRowBg = isDark ? '#0b1633' : theme.colors.surface;
  const menuBg = isDark ? '#1c2c46' : theme.colors.surface;

  const openEditor = (bookmark?: Bookmark) => {
    setEditorDraft(bookmark ?? null);
    setEditorOpen(true);
  };

  const handleDelete = (bookmark: Bookmark) => {
    Alert.alert('Move to Trash', `Remove "${bookmark.title}" from your active list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(bookmark.id),
      },
    ]);
  };

  const handleCopy = async (url: string) => {
    const clipboard = (globalThis as any)?.navigator?.clipboard;
    if (Platform.OS === 'web' && clipboard?.writeText) {
      await clipboard.writeText(url);
      showSuccess('Link copied');
      return;
    }
    showInfo('Copy is available on web for now');
  };

  const handleSave = (payload: BookmarkInput) => {
    if (editorDraft) {
      updateMutation.mutate({ id: editorDraft.id, payload });
    } else {
      createMutation.mutate(payload);
    }
    setEditorOpen(false);
  };

  const applySearch = () => {
    setAppliedSearch(pendingSearch.trim());
  };

  const clearSearch = () => {
    setPendingSearch('');
    setAppliedSearch('');
  };

  return (
    <View style={[styles.page, { backgroundColor: pageBg }]}>
      <TopAppBar title="Bookmarks" showBack onBackPress={() => router.back()} />

      <View style={styles.body}>
        <View style={styles.main}>
          <Surface style={[styles.topControls, { backgroundColor: iconRowBg }]} elevation={1}>
            <Menu
              visible={navMenuOpen}
              onDismiss={() => setNavMenuOpen(false)}
              contentStyle={[styles.menuContent, { backgroundColor: menuBg }]}
              anchor={
                <IconButton
                  icon="menu"
                  size={20}
                  onPress={() => setNavMenuOpen(true)}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={styles.controlIconButton}
                />
              }
            >
              {MENU_ITEMS.map((item) => (
            <Menu.Item
              key={item.key}
              leadingIcon={item.icon as any}
              onPress={() => {
                setActiveMenu(item.key);
                setSelectedCategoryId(null);
                setSelectedTag(null);
                setNavMenuOpen(false);
                refetch();
              }}
              title={item.label}
            />
          ))}
            </Menu>

            <IconButton
              icon="magnify"
              size={20}
              onPress={() =>
                setShowSearch((prev) => {
                  const next = !prev;
                  if (!next) clearSearch();
                  return next;
                })
              }
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.controlIconButton}
            />

            <Menu
              visible={layoutMenuOpen}
              onDismiss={() => setLayoutMenuOpen(false)}
              contentStyle={[styles.menuContent, { backgroundColor: menuBg }]}
              anchor={
                <IconButton
                  icon="view-dashboard-outline"
                  size={20}
                  onPress={() => setLayoutMenuOpen(true)}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={styles.controlIconButton}
                />
              }
            >
              <Menu.Item
                leadingIcon="view-grid-outline"
                title="Card"
                onPress={() => {
                  setViewMode('card');
                  setLayoutMenuOpen(false);
                }}
              />
              <Menu.Item
                leadingIcon="view-list-outline"
                title="List"
                onPress={() => {
                  setViewMode('list');
                  setLayoutMenuOpen(false);
                }}
              />
              <Menu.Item
                leadingIcon="table"
                title="Table"
                onPress={() => {
                  setViewMode('table');
                  setLayoutMenuOpen(false);
                }}
              />
            </Menu>
          </Surface>

          {showSearch ? (
            <View style={styles.searchRow}>
              <TextInput
                mode="outlined"
                placeholder="Search bookmarks, categories, URLs"
                value={pendingSearch}
                onChangeText={setPendingSearch}
                dense
                style={styles.searchInput}
                right={
                  <TextInput.Icon
                    icon="magnify"
                    onPress={applySearch}
                    forceTextInputFocus={false}
                  />
                }
                onSubmitEditing={applySearch}
              />
              <Text style={styles.countText}>{totalCount} total</Text>
            </View>
          ) : (
            <Text style={styles.countText}>{totalCount} total</Text>
          )}

          {viewMode === 'table' ? (
            <View style={styles.tableShell}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colTitle]}>Title</Text>
                <Text style={[styles.tableHeaderText, styles.colCategory]}>Category</Text>
                <Text style={[styles.tableHeaderText, styles.colActions]}>Actions</Text>
              </View>
              <FlatList
                key={`${viewMode}-${columns}`}
                data={visibleBookmarks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.tableContent}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                renderItem={({ item }) => (
                  <BookmarkCard
                    bookmark={item}
                    theme={theme}
                    viewMode={viewMode}
                    onOpen={() => Linking.openURL(item.url)}
                    onCopy={() => handleCopy(item.url)}
                    onEdit={() => openEditor(item)}
                    onDelete={() => handleDelete(item)}
                    onToggleFavorite={() =>
                      updateMutation.mutate({
                        id: item.id,
                        payload: { is_favorite: !item.is_favorite },
                      })
                    }
                    categoryName={categories.find((c) => c.id === item.category_id)?.name}
                    actionMenuId={actionMenuId}
                    setActionMenuId={setActionMenuId}
                    cardBg={cardBg}
                    chipBg={chipBg}
                    chipTextColor={chipTextColor}
                  />
                )}
                ListEmptyComponent={
                  <Surface style={styles.emptyState} elevation={0}>
                    <MaterialCommunityIcons
                      name="bookmark-outline"
                      size={48}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="titleMedium" style={{ marginTop: 12 }}>
                      No bookmarks yet
                    </Text>
                    <Text style={styles.emptyHint}>
                      Add your first bookmark to start building your collection.
                    </Text>
                    <Button mode="contained" onPress={() => openEditor()} style={{ marginTop: 16 }}>
                      Add bookmark
                    </Button>
                  </Surface>
                }
              />
            </View>
          ) : (
            <FlatList
              key={`${viewMode}-${columns}`}
              data={visibleBookmarks}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'card' ? columns : 1}
              columnWrapperStyle={viewMode === 'card' && columns > 1 ? styles.columnWrap : undefined}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
              renderItem={({ item }) => (
                <BookmarkCard
                  bookmark={item}
                  theme={theme}
                  viewMode={viewMode}
                  onOpen={() => Linking.openURL(item.url)}
                  onCopy={() => handleCopy(item.url)}
                  onEdit={() => openEditor(item)}
                  onDelete={() => handleDelete(item)}
                  onToggleFavorite={() =>
                    updateMutation.mutate({
                      id: item.id,
                      payload: { is_favorite: !item.is_favorite },
                    })
                  }
                  categoryName={categories.find((c) => c.id === item.category_id)?.name}
                  actionMenuId={actionMenuId}
                  setActionMenuId={setActionMenuId}
                  cardBg={cardBg}
                  chipBg={chipBg}
                  chipTextColor={chipTextColor}
                />
              )}
              ListEmptyComponent={
                <Surface style={styles.emptyState} elevation={0}>
                  <MaterialCommunityIcons
                    name="bookmark-outline"
                    size={48}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text variant="titleMedium" style={{ marginTop: 12 }}>
                    No bookmarks yet
                  </Text>
                  <Text style={styles.emptyHint}>
                    Add your first bookmark to start building your collection.
                  </Text>
                  <Button mode="contained" onPress={() => openEditor()} style={{ marginTop: 16 }}>
                    Add bookmark
                  </Button>
                </Surface>
              }
            />
          )}
        </View>
      </View>

      <BookmarkEditorModal
        visible={editorOpen}
        theme={theme}
        initial={editorDraft}
        categories={categories}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSave}
        onManageCategories={() => {
          setEditorOpen(false);
          router.push('/company/categories');
        }}
      />

      <Pressable style={styles.fab} onPress={() => openEditor()}>
        <MaterialCommunityIcons name="plus" size={24} color={theme.colors.onPrimary} />
      </Pressable>
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
  onDelete,
  onToggleFavorite,
  categoryName,
  actionMenuId,
  setActionMenuId,
  cardBg,
  chipBg,
  chipTextColor,
}: {
  bookmark: Bookmark;
  theme: AppTheme;
  viewMode: ViewMode;
  onOpen: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  categoryName?: string;
  actionMenuId: string | null;
  setActionMenuId: (id: string | null) => void;
  cardBg: string;
  chipBg: string;
  chipTextColor: string;
}) {
  const isTable = viewMode === 'table';
  const isList = viewMode === 'list';
  const menuVisible = actionMenuId === bookmark.id;
  const previewUrl = bookmark.thumbnail_url || bookmark.og_image || bookmark.favicon_url || '';

  const actionMenu = (
    <Menu
      visible={menuVisible}
      onDismiss={() => setActionMenuId(null)}
      anchor={
        <IconButton
          icon="dots-vertical"
          size={18}
          onPress={() => setActionMenuId(bookmark.id)}
          iconColor={theme.colors.onSurfaceVariant}
        />
      }
    >
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
      <Menu.Item
        leadingIcon="trash-can-outline"
        title="Delete"
        onPress={() => {
          setActionMenuId(null);
          onDelete();
        }}
      />
    </Menu>
  );

  if (isTable) {
    return (
      <View style={[stylesTable.row, { borderColor: theme.colors.outlineVariant }]}>
        <View style={stylesTable.colTitle}>
          <View style={stylesTable.titleRow}>
            {previewUrl ? (
              <Image source={{ uri: previewUrl }} style={stylesTable.preview} resizeMode="cover" />
            ) : (
              <View style={stylesTable.previewFallback}>
                <MaterialCommunityIcons
                  name="web"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            )}
            <View style={stylesTable.titleTextWrap}>
              <Text style={stylesTable.title} numberOfLines={1}>
                {bookmark.title}
              </Text>
              <Text style={stylesTable.url} numberOfLines={1}>
                {bookmark.url}
              </Text>
            </View>
          </View>
        </View>
        <View style={stylesTable.colCategory}>
          {categoryName ? (
            <CategoryBadge
              label={categoryName}
              bgColor={chipBg}
              textColor={chipTextColor}
            />
          ) : (
            <Text style={stylesTable.muted}>-</Text>
          )}
        </View>
        <View style={stylesTable.colActions}>
          <IconButton
            icon={bookmark.is_favorite ? 'star' : 'star-outline'}
            size={18}
            onPress={onToggleFavorite}
            iconColor={theme.colors.onSurfaceVariant}
          />
          {actionMenu}
        </View>
      </View>
    );
  }

  if (isList) {
    return (
      <Surface style={[stylesList.row, { backgroundColor: cardBg }]} elevation={1}>
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={stylesList.preview} resizeMode="cover" />
        ) : (
          <View style={stylesList.previewFallback}>
            <MaterialCommunityIcons name="web" size={14} color={theme.colors.onSurfaceVariant} />
          </View>
        )}
        <Pressable onPress={onOpen} style={stylesList.content}>
          <Text style={stylesList.title} numberOfLines={1}>
            {bookmark.title}
          </Text>
          <Text style={stylesList.url} numberOfLines={1}>
            {bookmark.url}
          </Text>
          {!!categoryName && (
            <CategoryBadge
              label={categoryName}
              bgColor={chipBg}
              textColor={chipTextColor}
            />
          )}
        </Pressable>
        <View style={stylesList.actions}>
          <IconButton
            icon={bookmark.is_favorite ? 'star' : 'star-outline'}
            size={18}
            onPress={onToggleFavorite}
            iconColor={theme.colors.onSurfaceVariant}
          />
          {actionMenu}
        </View>
      </Surface>
    );
  }

  return (
    <Surface
      style={[
        stylesCard.card,
        { backgroundColor: cardBg },
      ]}
      elevation={1}
    >
      <Pressable onPress={onOpen} style={{ flex: 1 }}>
        <View style={stylesCard.header}>
          <View style={stylesCard.titleRow}>
            <Text variant="titleMedium" numberOfLines={1} style={stylesCard.title}>
              {bookmark.title}
            </Text>
          </View>
          <View style={stylesCard.headerActions}>
            <IconButton
              icon={bookmark.is_favorite ? 'star' : 'star-outline'}
              size={18}
              onPress={onToggleFavorite}
              iconColor={theme.colors.onSurfaceVariant}
            />
            {actionMenu}
          </View>
        </View>

        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={stylesCard.preview} resizeMode="cover" />
        ) : null}

        {bookmark.description ? (
          <Text
            style={[stylesCard.description, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {bookmark.description}
          </Text>
        ) : null}

        <Text style={[stylesCard.url, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {bookmark.url}
        </Text>

        <View style={stylesCard.metaRow}>
          {!!categoryName && (
            <CategoryBadge
              label={categoryName}
              bgColor={chipBg}
              textColor={chipTextColor}
            />
          )}
          {(bookmark.tags || []).slice(0, 3).map((tag) => (
            <Chip
              compact
              key={tag}
              style={[
                stylesCard.metaChip,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              #{tag}
            </Chip>
          ))}
        </View>
      </Pressable>
    </Surface>
  );
}

function CategoryBadge({
  label,
  bgColor,
  textColor,
}: {
  label: string;
  bgColor: string;
  textColor: string;
}) {
  return (
    <View style={[stylesBadge.pill, { backgroundColor: bgColor }]}>
      <Text numberOfLines={1} style={[stylesBadge.pillText, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
}

function BookmarkEditorModal({
  visible,
  theme,
  initial,
  categories,
  onClose,
  onSubmit,
  onManageCategories,
}: {
  visible: boolean;
  theme: AppTheme;
  initial: Bookmark | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (payload: BookmarkInput) => void;
  onManageCategories: () => void;
}) {
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [tags, setTags] = React.useState('');
  const [favorite, setFavorite] = React.useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = React.useState(false);
  React.useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setUrl(initial?.url ?? '');
      setDescription(initial?.description ?? '');
      setCategoryId(initial?.category_id ?? null);
      setTags((initial?.tags ?? []).join(', '));
      setFavorite(initial?.is_favorite ?? false);
    }
  }, [visible, initial]);

  const handleSave = () => {
    const payload: BookmarkInput = {
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      is_favorite: favorite,
    };
    onSubmit(payload);
  };

  const selectedCategoryLabel =
    categories.find((c) => c.id === categoryId)?.name ?? 'Select category';

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        style={stylesModal.wrapper}
        contentContainerStyle={[
          stylesModal.container,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="titleMedium">
          {initial ? 'Edit Bookmark' : 'New Bookmark'}
        </Text>
        <Text style={[stylesModal.label, { color: theme.colors.onSurfaceVariant }]}>
          <Text style={[stylesModal.required, { color: theme.colors.error }]}>*</Text> URL
        </Text>
        <TextInput
          label=""
          value={url}
          onChangeText={setUrl}
          mode="outlined"
          placeholder="https://example.com"
          autoCapitalize="none"
          keyboardType="url"
          multiline
          numberOfLines={2}
          dense
          style={stylesModal.input}
          contentStyle={stylesModal.inputContent}
        />
        <View style={stylesModal.labelRow}>
          <Text style={[stylesModal.label, { color: theme.colors.onSurfaceVariant }]}>
            <Text style={[stylesModal.required, { color: theme.colors.error }]}>*</Text> Category
          </Text>
          <Pressable onPress={onManageCategories} style={stylesModal.addCategoryLinkInline}>
            <MaterialCommunityIcons
              name="plus"
              size={14}
              color={theme.colors.primary}
            />
            <Text style={[stylesModal.addCategoryText, { color: theme.colors.primary }]}>
              Add new
            </Text>
          </Pressable>
        </View>
        <View style={stylesModal.categoryRow}>
          <Pressable onPress={() => setCategoryMenuOpen(true)} style={{ flex: 1 }}>
            <TextInput
              label=""
              value={selectedCategoryLabel}
              mode="outlined"
              editable={false}
              placeholder="Select category"
              right={<TextInput.Icon icon="menu-down" />}
              dense
              style={stylesModal.input}
              contentStyle={stylesModal.inputContent}
            />
          </Pressable>
        </View>
        <Text style={[stylesModal.label, { color: theme.colors.onSurfaceVariant }]}>Title</Text>
        <TextInput
          label=""
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          placeholder="Bookmark title"
          dense
          style={stylesModal.input}
          contentStyle={stylesModal.inputContent}
        />
        <Text style={[stylesModal.label, { color: theme.colors.onSurfaceVariant }]}>
          Description
        </Text>
        <TextInput
          label=""
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          placeholder="Short description"
          multiline
          numberOfLines={3}
          dense
          style={stylesModal.input}
          contentStyle={stylesModal.textAreaContent}
        />
        <Text style={[stylesModal.label, { color: theme.colors.onSurfaceVariant }]}>
          Tags (comma separated)
        </Text>
        <TextInput
          label=""
          value={tags}
          onChangeText={setTags}
          mode="outlined"
          placeholder="tag1, tag2, tag3"
          multiline
          numberOfLines={2}
          dense
          style={stylesModal.input}
          contentStyle={stylesModal.textAreaContent}
        />
        <Text style={[stylesModal.label, { color: theme.colors.onSurfaceVariant }]}>
          Favorite
        </Text>
        <View style={stylesModal.switchRow}>
          <Switch value={favorite} onValueChange={setFavorite} />
        </View>
        <View style={stylesModal.actions}>
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={!url.trim() || !categoryId}
          >
            Save
          </Button>
          <Button mode="text" onPress={onClose}>
            Cancel
          </Button>
        </View>
      </Modal>
      <Portal>
        <Modal
          visible={categoryMenuOpen}
          onDismiss={() => setCategoryMenuOpen(false)}
          contentContainerStyle={[
            stylesModal.menuContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>
            Choose category
          </Text>
          <View style={stylesModal.menuList}>
            <Button
              mode={categoryId ? 'text' : 'contained'}
              onPress={() => {
                setCategoryId(null);
                setCategoryMenuOpen(false);
              }}
            >
              No category
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                mode={categoryId === cat.id ? 'contained' : 'text'}
                onPress={() => {
                  setCategoryId(cat.id);
                  setCategoryMenuOpen(false);
                }}
                style={{ alignItems: 'flex-start' }}
              >
                {cat.name}
              </Button>
            ))}
          </View>
        </Modal>
      </Portal>
    </Portal>
  );
}

const makeStyles = (theme: AppTheme) => {
  const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    body: {
      flex: 1,
    },
    main: {
      flex: 1,
      padding: 16,
    },
    topControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: 2,
      paddingHorizontal: 4,
      borderRadius: 10,
      gap: 0,
      marginBottom: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    controlIconButton: {
      margin: 0,
      width: 32,
      height: 32,
    },
    menuContent: {
      borderRadius: 14,
      paddingVertical: 6,
    },
    searchRow: {
      marginBottom: 8,
      gap: 6,
    },
    searchInput: {
      backgroundColor: theme.colors.surface,
      height: 34,
    },
    countText: {
      marginTop: 6,
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    listContent: {
      paddingTop: 10,
      paddingBottom: 24,
    },
    columnWrap: {
      gap: 12,
    },
    emptyState: {
      padding: 28,
      borderRadius: 18,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    emptyHint: {
      marginTop: 8,
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderBottomWidth: 1,
      borderColor,
    },
    tableHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
    },
    colTitle: {
      flex: 1,
    },
    colCategory: {
      width: 130,
    },
    colActions: {
      width: 90,
      textAlign: 'right',
    },
    tableShell: {
      borderWidth: 1,
      borderColor,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    tableContent: {
      gap: 0,
      paddingBottom: 16,
    },
  });
};

const stylesCard = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 140,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginBottom: 12,
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
  preview: {
    width: '100%',
    height: 92,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#0f172a22',
  },
  description: {
    color: '#94a3b8',
    marginBottom: 6,
    fontSize: 12,
  },
  url: {
    color: '#8aa0bf',
    fontSize: 12,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    backgroundColor: '#f1f5f9',
  },
});

const stylesList = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  preview: {
    width: 52,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0f172a22',
  },
  previewFallback: {
    width: 52,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a22',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  url: {
    fontSize: 11,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});

const stylesTable = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  colTitle: {
    flex: 1,
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
    height: 18,
    borderRadius: 4,
    backgroundColor: '#0f172a22',
  },
  previewFallback: {
    width: 26,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a22',
  },
  colCategory: {
    width: 130,
  },
  colActions: {
    width: 90,
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
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
});

const stylesModal = StyleSheet.create({
  wrapper: {
    justifyContent: 'flex-start',
    paddingTop: 24,
  },
  container: {
    marginHorizontal: 18,
    borderRadius: 18,
    padding: 20,
  },
  label: {
    marginTop: 12,
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    marginTop: 6,
  },
  inputContent: {
    minHeight: 36,
    paddingVertical: 6,
  },
  textAreaContent: {
    minHeight: 64,
    paddingVertical: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  addCategoryLinkInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  menuContainer: {
    marginHorizontal: 18,
    borderRadius: 16,
    padding: 16,
  },
  menuList: {
    gap: 6,
  },
});
