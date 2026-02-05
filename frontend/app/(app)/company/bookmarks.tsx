// frontend/app/(app)/company/bookmarks.tsx
import React from 'react';
import {
  Alert,
  FlatList,
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
  Divider,
  IconButton,
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
import type { Bookmark, BookmarkInput, Category } from '../../../src/features/bookmarks/types';
import {
  createBookmark,
  deleteBookmark,
  listBookmarks,
  updateBookmark,
} from '../../../src/features/bookmarks/api';
import { listCategories } from '../../../src/features/bookmarks/categories.api';

type ViewMode = 'card' | 'list' | 'compact';
type MenuKey = 'all' | 'favorites' | 'categories' | 'tags' | 'recent' | 'trash' | 'settings';

const MENU_ITEMS: Array<{ key: MenuKey; label: string; icon: string }> = [
  { key: 'all', label: 'Dashboard', icon: 'view-grid-outline' },
  { key: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { key: 'categories', label: 'Categories', icon: 'shape-outline' },
  { key: 'tags', label: 'Tags', icon: 'tag-outline' },
  { key: 'recent', label: 'Recently Added', icon: 'clock-outline' },
  { key: 'trash', label: 'Trash', icon: 'trash-can-outline' },
  { key: 'settings', label: 'Settings', icon: 'cog-outline' },
];

export default function CompanyBookmarks() {
  const theme = useTheme<AppTheme>();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess, showInfo } = useToast();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  const [viewMode, setViewMode] = React.useState<ViewMode>('card');
  const [search, setSearch] = React.useState('');
  const [activeMenu, setActiveMenu] = React.useState<MenuKey>('all');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorDraft, setEditorDraft] = React.useState<Bookmark | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('company.bookmarks.view');
        if (saved === 'card' || saved === 'list' || saved === 'compact') {
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
      search: search.trim() || undefined,
      favorite: activeMenu === 'favorites',
      category_id: selectedCategoryId || undefined,
      tag: selectedTag || undefined,
      deleted: activeMenu === 'trash',
    }),
    [search, activeMenu, selectedCategoryId, selectedTag]
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
    mutationFn: ({ id, payload }: { id: string; payload: BookmarkInput }) =>
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
    const now = Date.now();
    return now - 1000 * 60 * 60 * 24 * 7;
  }, []);

  const visibleBookmarks = React.useMemo(() => {
    if (activeMenu !== 'recent') return bookmarks;
    return bookmarks.filter((b) => new Date(b.created_at).getTime() >= recentCutoff);
  }, [bookmarks, activeMenu, recentCutoff]);

  const showSidebar = width >= 900;
  const columns = viewMode === 'card' ? (width >= 1300 ? 3 : width >= 980 ? 2 : 1) : 1;

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

  return (
    <View style={styles.page}>
      <TopAppBar title="Bookmarks" showBack onBackPress={() => router.back()} />

      <View style={styles.body}>
        {showSidebar && (
          <Surface style={styles.sidebar} elevation={1}>
            <Text style={styles.sidebarTitle}>Navigation</Text>
            {MENU_ITEMS.map((item) => {
              const active = activeMenu === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setActiveMenu(item.key);
                    if (item.key !== 'categories') setSelectedCategoryId(null);
                    if (item.key !== 'tags') setSelectedTag(null);
                  }}
                  style={[styles.sidebarItem, active && styles.sidebarItemActive]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={18}
                    color={active ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                  <Text style={[styles.sidebarItemText, active && styles.sidebarItemTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}

            <Divider style={styles.sidebarDivider} />

            <Text style={styles.sidebarSectionTitle}>Categories</Text>
            <View style={styles.sidebarChips}>
              {categories.length === 0 && (
                <Text style={styles.sidebarHint}>No categories yet</Text>
              )}
              {categories.map((cat) => (
                <Chip
                  key={cat.id}
                  compact
                  selected={selectedCategoryId === cat.id}
                  onPress={() => {
                    setActiveMenu('categories');
                    setSelectedCategoryId((prev) => (prev === cat.id ? null : cat.id));
                  }}
                  style={styles.sidebarChip}
                >
                  {cat.name}
                </Chip>
              ))}
            </View>

            <Text style={styles.sidebarSectionTitle}>Tags</Text>
            <View style={styles.sidebarChips}>
              {tags.length === 0 && <Text style={styles.sidebarHint}>No tags yet</Text>}
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  compact
                  selected={selectedTag === tag}
                  onPress={() => {
                    setActiveMenu('tags');
                    setSelectedTag((prev) => (prev === tag ? null : tag));
                  }}
                  style={styles.sidebarChip}
                >
                  #{tag}
                </Chip>
              ))}
            </View>
          </Surface>
        )}

        <View style={styles.main}>
          {!showSidebar && (
            <View style={styles.mobileMenuRow}>
              {MENU_ITEMS.map((item) => (
                <Chip
                  key={item.key}
                  compact
                  icon={item.icon as any}
                  selected={activeMenu === item.key}
                  onPress={() => setActiveMenu(item.key)}
                  style={styles.mobileMenuChip}
                >
                  {item.label}
                </Chip>
              ))}
            </View>
          )}

          <View style={styles.toolbar}>
            <View style={styles.searchWrap}>
              <TextInput
                mode="outlined"
                placeholder="Search bookmarks, URLs, or notes"
                value={search}
                onChangeText={setSearch}
                left={<TextInput.Icon icon="magnify" />}
                dense
                style={styles.searchInput}
              />
              <Text style={styles.countText}>{totalCount} total</Text>
            </View>

            <View style={styles.toolbarActions}>
              <View style={styles.viewToggle}>
                <IconButton
                  icon="view-grid-outline"
                  size={20}
                  mode={viewMode === 'card' ? 'contained' : 'outlined'}
                  onPress={() => setViewMode('card')}
                />
                <IconButton
                  icon="view-list-outline"
                  size={20}
                  mode={viewMode === 'list' ? 'contained' : 'outlined'}
                  onPress={() => setViewMode('list')}
                />
                <IconButton
                  icon="format-list-bulleted"
                  size={20}
                  mode={viewMode === 'compact' ? 'contained' : 'outlined'}
                  onPress={() => setViewMode('compact')}
                />
              </View>
              <IconButton
                icon="refresh"
                mode="outlined"
                size={20}
                onPress={() => refetch()}
                disabled={isFetching}
              />
              <Button mode="contained" icon="plus" onPress={() => openEditor()}>
                Add
              </Button>
            </View>
          </View>

          <FlatList
            key={`${viewMode}-${columns}`}
            data={visibleBookmarks}
            keyExtractor={(item) => item.id}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? styles.columnWrap : undefined}
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
}) {
  const compact = viewMode === 'compact';
  return (
    <Surface
      style={[
        stylesCard.card,
        compact && stylesCard.cardCompact,
        { backgroundColor: theme.colors.surface },
      ]}
      elevation={1}
    >
      <Pressable onPress={onOpen} style={{ flex: 1 }}>
        <View style={stylesCard.header}>
          <View style={stylesCard.titleRow}>
            <MaterialCommunityIcons
              name="link-variant"
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="titleMedium" numberOfLines={1} style={stylesCard.title}>
              {bookmark.title}
            </Text>
          </View>
          <IconButton
            icon={bookmark.is_favorite ? 'star' : 'star-outline'}
            size={18}
            onPress={onToggleFavorite}
          />
        </View>

        {!compact && (
          <Text
            style={[stylesCard.description, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {bookmark.description || bookmark.url}
          </Text>
        )}

        <Text style={[stylesCard.url, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {bookmark.url}
        </Text>

        {!compact && (
          <View style={stylesCard.metaRow}>
            {!!categoryName && (
              <Chip
                compact
                style={[
                  stylesCard.metaChip,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                {categoryName}
              </Chip>
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
        )}
      </Pressable>

      <View style={stylesCard.actions}>
        <IconButton icon="open-in-new" size={18} onPress={onOpen} />
        <IconButton icon="content-copy" size={18} onPress={onCopy} />
        <IconButton icon="pencil-outline" size={18} onPress={onEdit} />
        <IconButton icon="trash-can-outline" size={18} onPress={onDelete} />
      </View>
    </Surface>
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

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
    },
    sidebar: {
      width: 260,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.colors.outlineVariant,
    },
    sidebarTitle: {
      fontSize: 14,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
    },
    sidebarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    sidebarItemActive: {
      backgroundColor: theme.colors.secondaryContainer,
    },
    sidebarItemText: {
      color: theme.colors.onSurfaceVariant,
    },
    sidebarItemTextActive: {
      color: theme.colors.onSecondaryContainer,
    },
    sidebarDivider: {
      marginVertical: 16,
    },
    sidebarSectionTitle: {
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
    },
    sidebarChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    sidebarChip: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    sidebarHint: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    main: {
      flex: 1,
      padding: 16,
    },
    mobileMenuRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    mobileMenuChip: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    searchWrap: {
      flex: 1,
      minWidth: 240,
    },
    searchInput: {
      backgroundColor: theme.colors.surface,
    },
    countText: {
      marginTop: 6,
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    toolbarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    viewToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    listContent: {
      gap: 12,
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
  });

const stylesCard = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 150,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  cardCompact: {
    minHeight: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    flex: 1,
  },
  description: {
    color: '#475569',
    marginBottom: 8,
  },
  url: {
    color: '#64748b',
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
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
