// frontend/app/(app)/company/bookmarks/edit-bookmark.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Switch,
  useTheme,
  Portal,
  MD3Theme,
  Surface,
  Divider,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import TopAppBar from '@company/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { updateBookmark } from '../../../../src/features/bookmarks/api';
import { listCategories } from '../../../../src/features/bookmarks/categories.api';

type CategoryOption = { id: string; name: string };

export default function EditBookmark() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    url?: string;
    description?: string;
    category_id?: string;
    tags?: string;
    is_favorite?: string;
    thumbnail_url?: string;
    favicon_url?: string;
    og_title?: string;
    og_description?: string;
    og_image?: string;
  }>();

  const [url, setUrl] = useState(params.url || '');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const [title, setTitle] = useState(params.title || '');
  const [description, setDescription] = useState(params.description || '');
  const [tags, setTags] = useState(params.tags || '');
  const [favorite, setFavorite] = useState(params.is_favorite !== 'false');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ url?: string; title?: string; category_id?: string }>({});

  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catOptions, setCatOptions] = useState<CategoryOption[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const catCache = useRef<CategoryOption[] | null>(null);
  const initialResolved = useRef(false);

  const loadCategories = useCallback(async (): Promise<CategoryOption[]> => {
    if (catCache.current) return catCache.current;
    setCatLoading(true);
    try {
      const res = await listCategories({ limit: 1000 });
      const mapped = (res.data || []).map((c) => ({ id: c.id, name: c.name }));
      catCache.current = mapped;
      return mapped;
    } catch {
      showError('Failed to load categories');
      return [];
    } finally {
      setCatLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (params.category_id && !initialResolved.current) {
      initialResolved.current = true;
      (async () => {
        try {
          const res = await listCategories({ limit: 1000 });
          const list = (res.data || []).map((c) => ({ id: c.id, name: c.name }));
          catCache.current = list;
          const match = list.find((c) => c.id === params.category_id);
          if (match) setSelectedCategory(match);
        } catch {
          showError('Failed to load categories');
        }
      })();
    }
  }, [params.category_id, showError]);

  const handleUrlChange = useCallback((v: string) => {
    setUrl(v);
    if (fieldErrors.url) setFieldErrors((e) => ({ ...e, url: undefined }));
    if (!title.trim()) {
      try {
        const domain = new URL(v).hostname.replace(/^www\./, '');
        const name = domain.split('.')[0];
        if (name) setTitle(name.charAt(0).toUpperCase() + name.slice(1));
      } catch {}
    }
  }, [title, fieldErrors.url]);

  const openCategorySelector = useCallback(async () => {
    setCatModalVisible(true);
    const list = await loadCategories();
    setCatOptions(list);
  }, [loadCategories]);

  const handleSave = async () => {
    const errors: { url?: string; title?: string; category_id?: string } = {};
    if (!url.trim()) errors.url = 'URL is required.';
    if (!title.trim()) errors.title = 'Title is required.';
    if (!selectedCategory) errors.category_id = 'Category is required.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      await updateBookmark(params.id!, {
        title: title.trim(),
        url: url.trim(),
        description: description.trim() || null,
        category_id: selectedCategory?.id || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        is_favorite: favorite,
      });
      showSuccess('Bookmark updated');
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      if (router.canGoBack()) router.back(); else router.replace('/company/bookmarks');
    } catch (err: any) {
      showError(err?.message || 'Failed to update bookmark');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Edit Bookmark"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.formTitle}>
              Edit Bookmark
            </Text>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
                URL
              </Text>
              <TextInput
                value={url}
                onChangeText={handleUrlChange}
                mode="outlined"
                placeholder="https://example.com"
                testID="bookmark-url-input"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                textColor={theme.colors.onSurface}
                autoCapitalize="none"
                keyboardType="url"
                multiline
                numberOfLines={2}
                outlineColor={fieldErrors.url ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={fieldErrors.url ? theme.colors.error : theme.colors.primary}
              />
              {fieldErrors.url ? (
                <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.url}</Text>
              ) : null}
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
                Category
              </Text>
              <Pressable onPress={openCategorySelector} style={{ position: 'relative' }} testID="bookmark-category-selector">
                <TextInput
                  value={selectedCategory?.name ?? ''}
                  mode="outlined"
                  placeholder="Tap to select Category..."
                  placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                  textColor={theme.colors.onSurface}
                  editable={false}
                  outlineColor={fieldErrors.category_id ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                  style={{ pointerEvents: 'none' as any }}
                />
                <View style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', pointerEvents: 'none' }}>
                  <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
                </View>
              </Pressable>
              {fieldErrors.category_id ? (
                <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.category_id}</Text>
              ) : null}
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  if (fieldErrors.title) setFieldErrors((e) => ({ ...e, title: undefined }));
                }}
                mode="outlined"
                placeholder="Bookmark title"
                testID="bookmark-title-input"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                textColor={theme.colors.onSurface}
                outlineColor={fieldErrors.title ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={fieldErrors.title ? theme.colors.error : theme.colors.primary}
              />
              {fieldErrors.title ? (
                <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.title}</Text>
              ) : null}
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                placeholder="Short description"
                testID="bookmark-description-input"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                textColor={theme.colors.onSurface}
                multiline
                numberOfLines={3}
                outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>Tags (comma separated)</Text>
              <TextInput
                value={tags}
                onChangeText={setTags}
                mode="outlined"
                placeholder="tag1, tag2, tag3"
                testID="bookmark-tags-input"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                textColor={theme.colors.onSurface}
                multiline
                numberOfLines={2}
                outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
              />
            </View>

            <View style={styles.switchRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>Favorite</Text>
              <Switch value={favorite} onValueChange={setFavorite} color={theme.colors.primary} testID="bookmark-favorite-switch" />
            </View>

            <View style={styles.actionContainer}>
              <Button
                onPress={handleSave}
                disabled={saving}
                mode="contained"
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onSecondary}
                style={styles.saveBtn}
                testID="update-bookmark-button"
              >
                Update
              </Button>
              <Button
                onPress={() => router.back()}
                disabled={saving}
                mode="text"
                textColor={theme.colors.onSurfaceVariant + 'B3'}
                style={styles.closeBtn}
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>

      <CategorySelectionModal
        visible={catModalVisible}
        options={catOptions}
        loading={catLoading}
        onSelect={(opt) => {
          setSelectedCategory(opt);
          setCatModalVisible(false);
        }}
        onDismiss={() => setCatModalVisible(false)}
        theme={theme}
      />

      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Updating bookmark..." icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
    </View>
  );
}

function CategorySelectionModal({
  visible,
  options,
  loading,
  onSelect,
  onDismiss,
  theme,
}: {
  visible: boolean;
  options: CategoryOption[];
  loading: boolean;
  onSelect: (opt: CategoryOption) => void;
  onDismiss: () => void;
  theme: MD3Theme;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  const modalStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
    },
    modalTitle: {
      fontWeight: '800',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: 8,
    },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 42,
      marginBottom: 10,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    },
    searchIcon: { fontSize: 16, color: theme.colors.onSurfaceVariant, marginRight: 6 },
    searchField: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.onSurface,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    clearBtn: { padding: 4 },
    optionItem: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      paddingVertical: 20,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={modalStyles.overlay} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Surface style={modalStyles.card} elevation={4}>
            <Text variant="titleMedium" style={modalStyles.modalTitle}>Select Category</Text>

            <View style={modalStyles.searchWrapper}>
              <Text style={modalStyles.searchIcon}>🔍</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                mode="flat"
                placeholder="Search categories..."
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                style={[modalStyles.searchField, { backgroundColor: 'transparent' }]}
              />
              {!!search && (
                <Pressable onPress={() => setSearch('')} style={modalStyles.clearBtn}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>✕</Text>
                </Pressable>
              )}
            </View>

            <Divider style={{ marginBottom: 4 }} />

            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}>Loading...</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 300 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [
                      modalStyles.optionItem,
                      pressed && { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                    onPress={() => onSelect(item)}
                  >
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{item.name}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={modalStyles.emptyText}>
                    {search ? `No results for "${search}"` : 'No categories available.'}
                  </Text>
                }
              />
            )}

            <Button
              mode="text"
              onPress={onDismiss}
              style={{ alignSelf: 'flex-end', marginTop: 8 }}
              textColor={theme.colors.onSurfaceVariant}
            >
              Cancel
            </Button>
          </Surface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    formContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      gap: 16,
    },
    formTitle: {
      fontWeight: '700',
      textAlign: 'center',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    fieldRow: {
      gap: 6,
    },
    fieldLabel: {
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
    },
    errorText: {
      color: theme.colors.error,
      marginTop: 2,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    actionContainer: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 12,
      marginTop: 16,
    },
    saveBtn: {
      borderRadius: 8,
      alignSelf: 'center',
      minWidth: 140,
    },
    closeBtn: {
      alignSelf: 'center',
    },
  });
