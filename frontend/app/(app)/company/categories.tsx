// frontend/app/(app)/company/categories.tsx
import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Button,
  Divider,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  const { width } = useWindowDimensions();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const [selected, setSelected] = React.useState<Category | null>(null);
  const [name, setName] = React.useState('');

  const { data } = useQuery({
    queryKey: ['bookmark-categories'],
    queryFn: () => listCategories(),
  });

  const categories = data?.data ?? [];

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

  const isWide = width >= 900;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selected) {
      updateMutation.mutate({ id: selected.id, name: trimmed });
    } else {
      createMutation.mutate(trimmed);
    }
  };

  return (
    <View style={styles.page}>
      <TopAppBar title="Categories" showBack onBackPress={() => router.back()} />

      <View style={[styles.body, isWide && styles.bodyWide]}>
        <Surface style={styles.listPanel} elevation={1}>
          <View style={styles.listHeader}>
            <Text variant="titleMedium">All Categories</Text>
            <Text style={styles.countText}>{categories.length} total</Text>
          </View>
          <Divider style={styles.divider} />
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const active = selected?.id === item.id;
              return (
                <Pressable
                  onPress={() => {
                    setSelected(item);
                    setName(item.name);
                  }}
                  style={[styles.listRow, active && styles.listRowActive]}
                >
                  <View style={styles.listRowLeft}>
                    <MaterialCommunityIcons
                      name="shape-outline"
                      size={18}
                      color={active ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.listRowText, active && styles.listRowTextActive]}>
                      {item.name}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>
              );
            }}
          />
        </Surface>

        <Surface style={styles.editorPanel} elevation={1}>
          <Text variant="titleMedium">
            {selected ? 'Edit Category' : 'Add Category'}
          </Text>
          <Text style={styles.editorHint}>
            Names are unique. Use clear, short labels.
          </Text>
          <TextInput
            label="Category name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
          />
          <View style={styles.editorActions}>
            {selected && (
              <Button
                mode="text"
                onPress={() => {
                  setSelected(null);
                  setName('');
                }}
              >
                Cancel
              </Button>
            )}
            <Button mode="contained" onPress={submit} disabled={!name.trim()}>
              {selected ? 'Save changes' : 'Create category'}
            </Button>
          </View>
        </Surface>
      </View>
    </View>
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
      padding: 16,
      gap: 16,
    },
    bodyWide: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    listPanel: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      backgroundColor: theme.colors.surface,
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
    divider: {
      marginVertical: 12,
    },
    listContent: {
      gap: 8,
      paddingBottom: 12,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceVariant,
    },
    listRowActive: {
      backgroundColor: theme.colors.primaryContainer,
    },
    listRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    listRowText: {
      color: theme.colors.onSurface,
    },
    listRowTextActive: {
      color: theme.colors.onPrimaryContainer,
    },
    editorPanel: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      backgroundColor: theme.colors.surface,
    },
    editorHint: {
      marginTop: 6,
      color: theme.colors.onSurfaceVariant,
    },
    input: {
      marginTop: 16,
    },
    editorActions: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
  });
