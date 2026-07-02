// frontend/app/(app)/super-admin/subscription-plans/edit.tsx
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

export default function EditSubscriptionPlan() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    description: string;
    price: string;
    amcPrice: string;
    durationDays: string;
    isActive: string;
  }>();

  const [name, setName] = useState(params.name || '');
  const [description, setDescription] = useState(params.description || '');
  const [price, setPrice] = useState(params.price || '');
  const [amcPrice, setAmcPrice] = useState(params.amcPrice || '');
  const [durationDays, setDurationDays] = useState(params.durationDays || '30');
  const [isActive, setIsActive] = useState(params.isActive !== 'false');
  const [saving, setSaving] = useState(false);

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    price?: string;
    amcPrice?: string;
    durationDays?: string;
  }>({});

  const validateFields = (): boolean => {
    const errors: typeof fieldErrors = {};
    let isValid = true;

    if (!name.trim()) {
      errors.name = 'Plan name is required.';
      isValid = false;
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
      isValid = false;
    }

    const priceNum = parseFloat(price);
    const amcNum = parseFloat(amcPrice);
    const isFree = name.trim().toLowerCase() === 'free';

    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Price must be a positive number.';
      isValid = false;
    } else if (!isFree && priceNum < 1000) {
      errors.price = 'Paid plans must have a price of at least 1000.';
      isValid = false;
    }

    if (isNaN(amcNum) || amcNum < 0) {
      errors.amcPrice = 'AMC price must be a positive number.';
      isValid = false;
    } else if (!isFree && amcNum < 1000) {
      errors.amcPrice = 'Paid plans must have an AMC price of at least 1000.';
      isValid = false;
    }

    // Price must be strictly greater than AMC Price for paid plans
    if (isValid && !isFree && priceNum <= amcNum) {
      errors.price = 'Price must be strictly greater than AMC Price.';
      isValid = false;
    }

    const durationNum = parseInt(durationDays, 10);
    if (isNaN(durationNum) || durationNum < 7 || durationNum > 365) {
      errors.durationDays = 'Duration must be between 7 and 365 days.';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateFields()) return;

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        amc_price: parseFloat(amcPrice),
        duration_days: parseInt(durationDays, 10),
        is_active: isActive,
      };

      const url = `${API_BASE_URL}/super-admin/subscription-plans/${params.id}`;

      const response = await fetchJson(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showSuccess('Plan updated successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Error occurred during save');
      }
    } catch {
      showError('Network error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Update Plan Details"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          <View style={styles.formContainer}>
          <Text variant="titleMedium" style={styles.formTitle}>
            Modify Plan Details
          </Text>

          {/* Plan Name */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              Plan Name
            </Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
              }}
              mode="outlined"
              placeholder="E.g., Free, Silver, Gold"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
            />
            {fieldErrors.name ? (
              <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.name}</Text>
            ) : null}
          </View>

          {/* Description */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              placeholder="Brief details about the plan"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Pricing fields row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
                Price
              </Text>
              <TextInput
                value={price}
                onChangeText={(v) => {
                  setPrice(v);
                  if (fieldErrors.price) setFieldErrors((e) => ({ ...e, price: undefined }));
                }}
                mode="outlined"
                keyboardType="numeric"
                placeholder="E.g., 0, 1500"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                textColor={theme.colors.onSurface}
                outlineColor={fieldErrors.price ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={fieldErrors.price ? theme.colors.error : theme.colors.primary}
              />
              {fieldErrors.price ? (
                <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.price}</Text>
              ) : null}
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
                AMC Price
              </Text>
              <TextInput
                value={amcPrice}
                onChangeText={(v) => {
                  setAmcPrice(v);
                  if (fieldErrors.amcPrice) setFieldErrors((e) => ({ ...e, amcPrice: undefined }));
                }}
                mode="outlined"
                keyboardType="numeric"
                placeholder="E.g., 0, 1200"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                textColor={theme.colors.onSurface}
                outlineColor={fieldErrors.amcPrice ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={fieldErrors.amcPrice ? theme.colors.error : theme.colors.primary}
              />
              {fieldErrors.amcPrice ? (
                <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.amcPrice}</Text>
              ) : null}
            </View>
          </View>

          {/* Duration Days */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              Duration (Days)
            </Text>
            <TextInput
              value={durationDays}
              onChangeText={(v) => {
                setDurationDays(v);
                if (fieldErrors.durationDays) setFieldErrors((e) => ({ ...e, durationDays: undefined }));
              }}
              mode="outlined"
              keyboardType="numeric"
              placeholder="Min 7, Max 365"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.durationDays ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.durationDays ? theme.colors.error : theme.colors.primary}
            />
            {fieldErrors.durationDays ? (
              <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.durationDays}</Text>
            ) : null}
          </View>

          {/* Status Switch */}
          <View style={styles.switchRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>Enable/Disable</Text>
            <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
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
            <AppLoader message="Updating plan details..." icon="database-sync-outline" transparent />
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
