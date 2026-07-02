// frontend/app/(app)/company/bookmark-categories/edit-bookmark-category.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  useTheme,
  Portal,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';

import TopAppBar from '@company/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '../../../../src/utils/toast';
import { updateCategory } from '../../../../src/features/bookmarks/categories.api';

export default function EditBookmarkCategory() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();

  const [name, setName] = useState(params.name || '');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldErrors({ name: 'Category name is required.' });
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      await updateCategory(params.id!, trimmed);
      showSuccess('Bookmark category updated');
      router.back();
    } catch (err: any) {
      showError(err?.message || 'Failed to update bookmark category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Edit Bookmark Category"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.formTitle}>
              Edit Bookmark Category
            </Text>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
                Bookmark Category Name
              </Text>
              <TextInput
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (fieldErrors.name) setFieldErrors({});
                }}
                mode="outlined"
                placeholder="e.g. Office tools"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                textColor={theme.colors.onSurface}
                outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
              />
              {fieldErrors.name ? (
                <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.name}</Text>
              ) : null}
            </View>

            <View style={styles.actionContainer}>
              <Button
                onPress={handleSave}
                disabled={saving}
                mode="contained"
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onSecondary}
                style={styles.saveBtn}
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

      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Updating bookmark category..." icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    formContainer: {
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
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
