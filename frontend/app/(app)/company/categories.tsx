// frontend/app/(app)/company/categories.tsx
import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import TopAppBar from '@super-admin/components/TopAppBar';
import type { AppTheme } from '../../../src/theme/types';
import type { Category } from '../../../src/features/bookmarks/types';
import {
  createCategory,
  listCategories,
  updateCategory,
} from '../../../src/features/bookmarks/categories.api';
import { useToast } from '../../../src/utils/toast';

export default function CompanyCategories() {
  const theme = useTheme<AppTheme>();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const listRef = React.useRef<FlatList<Category>>(null);
  const searchInputRef = React.useRef<any>(null);

  const [selected, setSelected] = React.useState<Category | null>(null);
  const [name, setName] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [pendingQuery, setPendingQuery] = React.useState('');
  const [appliedQuery, setAppliedQuery] = React.useState('');
  const [showGoTop, setShowGoTop] = React.useState(false);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['bookmark-categories', appliedQuery],
    queryFn: ({ pageParam = 0 }) =>
      listCategories({ limit: 20, offset: pageParam, query: appliedQuery }),
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

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-categories'] });
      setName('');
      showSuccess('Category created');
    },
    onError: (err: any) => showError(err?.message || 'Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-categories'] });
      setSelected(null);
      setName('');
      showSuccess('Category updated');
    },
    onError: (err: any) => showError(err?.message || 'Failed to update category'),
  });

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selected) {
      updateMutation.mutate({ id: selected.id, name: trimmed });
    } else {
      createMutation.mutate(trimmed);
    }
  };

  const applySearch = () => {
    setAppliedQuery(pendingQuery.trim().toLowerCase());
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const resetSearch = () => {
    setPendingQuery('');
    setAppliedQuery('');
    refetch();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const toggleSearch = () => {
    setShowSearch((prev) => {
      const next = !prev;
      if (!next) {
        setPendingQuery('');
        setAppliedQuery('');
        refetch();
      } else {
        requestAnimationFrame(() => searchInputRef.current?.focus?.());
      }
      return next;
    });
  };


  return (
    <View style={styles.page}>
      <TopAppBar title="Categories" showBack onBackPress={() => router.back()} />

      <View style={styles.body}>
        <Surface style={styles.listPanel} elevation={1}>
          <View style={styles.listHeader}>
            <View>
              <Text variant="titleMedium">All Categories</Text>
              <Text style={styles.countText}>
                {totalCount} total
              </Text>
            </View>
            <Pressable onPress={toggleSearch} style={styles.searchToggle}>
              <MaterialCommunityIcons
                name={showSearch ? 'close' : 'magnify'}
                size={22}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>
          </View>
          {showSearch ? (
            <TextInput
              ref={searchInputRef}
              value={pendingQuery}
              onChangeText={setPendingQuery}
              mode="outlined"
              placeholder="Search categories"
              style={styles.searchInput}
              contentStyle={styles.searchInputContent}
              dense
              onSubmitEditing={applySearch}
              right={
                <TextInput.Icon
                  icon="magnify"
                  onPress={applySearch}
                  forceTextInputFocus={false}
                />
              }
            />
          ) : null}
          <Divider style={styles.divider} />
          <View style={styles.tableShell}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colNo]}>Sr. No.</Text>
              <Text style={[styles.tableHeaderText, styles.colName]}>
                Category Name
              </Text>
              <Text style={[styles.tableHeaderText, styles.colAction]}>Action</Text>
            </View>
            <FlatList
              ref={listRef}
              data={categories}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.2}
              onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                const shouldShow = offsetY > 260;
                setShowGoTop((prev) => (prev !== shouldShow ? shouldShow : prev));
              }}
              scrollEventThrottle={16}
              refreshing={isFetching && !isFetchingNextPage}
              onRefresh={resetSearch}
              ListEmptyComponent={
                isLoading ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator />
                    <Text style={styles.emptyText}>Loading categories...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      {appliedQuery
                        ? 'No categories match your search.'
                        : 'No categories found yet.'}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                categories.length ? (
                  <View style={styles.footer}>
                    {isFetchingNextPage ? (
                      <>
                        <ActivityIndicator size="small" />
                        <Text style={styles.footerText}>
                          Loading more categories...
                        </Text>
                      </>
                    ) : hasNextPage ? (
                      <Text style={styles.footerText}>
                        Scroll for more categories
                      </Text>
                    ) : showEndMessage ? (
                      <Text style={styles.footerText}>
                        You have reached the end.
                      </Text>
                    ) : null}
                  </View>
                ) : null
              }
              renderItem={({ item, index }) => (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, styles.colNo]}>
                    {index + 1}
                  </Text>
                  <Text
                    style={[styles.tableCellText, styles.colName]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <View style={[styles.colAction, styles.actionCell]}>
                    <Pressable
                      onPress={() => {
                        setSelected(item);
                        setName(item.name);
                        setModalOpen(true);
                      }}
                      style={styles.editIconButton}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </Pressable>
                  </View>
                </View>
              )}
            />
          </View>
        </Surface>
      </View>

      <Pressable
        style={styles.fab}
        onPress={() => {
          setSelected(null);
          setName('');
          setModalOpen(true);
        }}
      >
        <MaterialCommunityIcons name="plus" size={24} color={theme.colors.onPrimary} />
      </Pressable>

      {showGoTop ? (
        <Pressable
          style={styles.goTopFab}
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        >
          <MaterialCommunityIcons
            name="arrow-up-bold"
            size={20}
            color={theme.colors.onPrimary}
          />
          <Text style={styles.goTopText}>Go Top</Text>
        </Pressable>
      ) : null}

      <Portal>
        <Modal
          visible={modalOpen}
          onDismiss={() => setModalOpen(false)}
          style={styles.modalWrapper}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium">
            {selected ? 'Edit Category' : 'Add Category'}
          </Text>
          <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>
            <Text style={[styles.required, { color: theme.colors.error }]}>*</Text> Category
            name
          </Text>
          <TextInput
            label=""
            value={name}
            onChangeText={setName}
            mode="outlined"
            placeholder="e.g. Office tools"
            dense
            style={styles.input}
            contentStyle={styles.inputContent}
          />
          <View style={styles.modalActions}>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
              onPress={() => {
                submit();
                setModalOpen(false);
              }}
              disabled={!name.trim()}
            >
              {selected ? 'Save' : 'Create'}
            </Button>
            <Button mode="text" onPress={() => setModalOpen(false)}>
              Cancel
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => {
  const isDark = theme.dark;
  const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
  const pageBg = isDark ? '#0b1530' : theme.colors.background;
  const panelBg = isDark ? '#142a49' : theme.colors.surface;
  const softBg = isDark ? '#0b1633' : theme.colors.surfaceVariant;
  const inputBg = isDark ? '#1c2c46' : theme.colors.surface;
  const modalBg = isDark ? '#1c2c46' : theme.colors.surface;
  const rowBorder = isDark ? 'rgba(255,255,255,0.14)' : borderColor;

  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: pageBg,
    },
    body: {
      flex: 1,
      padding: 16,
    },
    listPanel: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: panelBg,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'transparent',
      alignSelf: 'stretch',
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    countText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    searchToggle: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: softBg,
    },
    searchInput: {
      marginTop: 12,
      height: 44,
      backgroundColor: inputBg,
    },
    searchInputContent: {
      height: 40,
    },
    divider: {
      marginVertical: 12,
      backgroundColor: rowBorder,
    },
    listContent: {
      gap: 0,
      paddingBottom: 120,
    },
    tableShell: {
      borderWidth: 1,
      borderColor: rowBorder,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
      borderBottomWidth: 1,
      borderColor: rowBorder,
    },
    tableHeaderText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      fontWeight: '600',
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
      borderBottomWidth: 1,
      borderColor: rowBorder,
    },
    tableCellText: {
      color: theme.colors.onSurface,
    },
    colNo: {
      width: 64,
    },
    colName: {
      flex: 1,
      paddingRight: 8,
    },
    colAction: {
      width: 90,
      alignItems: 'flex-start',
    },
    actionCell: {
      alignItems: 'flex-start',
    },
    editIconButton: {
      padding: 4,
      borderRadius: 16,
      backgroundColor: softBg,
      borderWidth: 1,
      borderColor: rowBorder,
    },
    input: {
      marginTop: 6,
    },
    inputContent: {
      minHeight: 36,
      paddingVertical: 6,
    },
    modalLabel: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: '600',
    },
    required: {
      fontSize: 12,
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
    goTopFab: {
      position: 'absolute',
      bottom: 24,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    goTopText: {
      color: theme.colors.onPrimary,
      fontSize: 12,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    footerText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    modalWrapper: {
      justifyContent: 'flex-start',
      paddingTop: 24,
    },
    modal: {
      marginHorizontal: 18,
      borderRadius: 16,
      padding: 18,
      backgroundColor: modalBg,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'transparent',
    },
    modalActions: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
    },
  });
};
