// frontend/app/(app)/super-admin/company-categories/edit.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Switch,
  Portal,
  useTheme,
  MD3Theme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

export default function EditCompanyCategory() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    isActive: string;
  }>();

  const [name, setName] = useState(params.name || '');
  const [isActive, setIsActive] = useState(params.isActive !== 'false');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});

  const handleSave = async () => {
    const errors: { name?: string } = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Category Name must be at least 2 characters.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/super-admin/company-categories/${params.id}`;

      const response = await fetchJson(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          is_active: isActive,
        }),
      });

      if (response.ok) {
        showSuccess(response.data?.message || 'Category updated successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Failed to save category details.');
      }
    } catch {
      showError('Network error saving category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Update Category Details"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          <View style={styles.formContainer}>
          <Text variant="titleMedium" style={styles.formTitle}>
            Modify Category
          </Text>

          {/* Category Name */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              Category Name
            </Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
              }}
              mode="outlined"
              placeholder="E.g., Hardware, Grocery"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
              testID="category-name-input"
            />
            {fieldErrors.name ? (
              <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.name}</Text>
            ) : null}
          </View>

          {/* Status Switch */}
          <View style={styles.switchRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>Enable/Disable</Text>
            <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} testID="category-active-switch" />
          </View>

          <View style={styles.actionContainer}>
            <Button
              onPress={handleSave}
              disabled={saving}
              mode="contained"
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
              style={styles.saveBtn}
              testID="save-category-button"
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

      {/* Centralized saving overlay */}
      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Updating category details..." icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
    </View>
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
