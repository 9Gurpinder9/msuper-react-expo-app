// frontend/app/(app)/super-admin/countries/add.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  useTheme,
  Portal,
  MD3Theme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

export default function AddCountry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; code?: string }>({});

  const handleSave = async () => {
    const errors: { name?: string; code?: string } = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Country Name must be at least 2 characters.';
    }
    if (!code.trim() || code.trim().length < 2) {
      errors.code = 'ISO Code must be at least 2 characters.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/super-admin/countries`;

      const response = await fetchJson(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          phone_code: phoneCode.trim() || null,
          is_active: true, // Default to true on creation
        }),
      });

      if (response.ok) {
        showSuccess(response.data?.message || 'Country registered successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Failed to save country details.');
      }
    } catch {
      showError('Network error saving country.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Register New Country"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          <View style={styles.formContainer}>
          <Text variant="titleMedium" style={styles.formTitle}>
            Enter Country Details
          </Text>

          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              Country Name
            </Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
              }}
              mode="outlined"
              placeholder="E.g., India, United States"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
            />
            {fieldErrors.name ? (
              <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.name}</Text>
            ) : null}
          </View>

          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              ISO Abbreviated Code
            </Text>
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v);
                if (fieldErrors.code) setFieldErrors((e) => ({ ...e, code: undefined }));
              }}
              mode="outlined"
              placeholder="E.g., IN, US"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              autoCapitalize="characters"
              maxLength={10}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.code ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.code ? theme.colors.error : theme.colors.primary}
            />
            {fieldErrors.code ? (
              <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.code}</Text>
            ) : null}
          </View>

          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>Phone Dial Code</Text>
            <TextInput
              value={phoneCode}
              onChangeText={setPhoneCode}
              mode="outlined"
              placeholder="E.g., +91, +1"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
            />
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
              Save
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
            <AppLoader message="Registering new country..." icon="database-sync-outline" transparent />
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
