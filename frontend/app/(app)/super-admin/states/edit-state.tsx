// frontend/app/(app)/super-admin/states/edit.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, FlatList, useWindowDimensions } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Switch,
  Dialog,
  Portal,
  Avatar,
  Searchbar,
  useTheme,
  MD3Theme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

type CountryItem = {
  id: string;
  name: string;
  code: string;
};

export default function EditState() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    code: string;
    countryId: string;
    countryName: string;
    isActive: string;
  }>();

  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [countryId, setCountryId] = useState(params.countryId || '');
  const [countryName, setCountryName] = useState(params.countryName || '');
  const [name, setName] = useState(params.name || '');
  const [code, setCode] = useState(params.code || '');
  const [isActive, setIsActive] = useState(params.isActive !== 'false');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; code?: string; country?: string }>({});

  // Country Picker Modal state
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const fetchCountries = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetchJson(`${API_BASE_URL}/super-admin/countries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && response.data) {
        const activeList = (response.data.data || []).filter((c: any) => c.is_active);
        setCountries(activeList);
      }
    } catch (err) {
      console.error('Error fetching countries list', err);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleSave = async () => {
    const errors: { name?: string; code?: string; country?: string } = {};
    if (!countryId) {
      errors.country = 'Country selection is required.';
    }
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'State Name must be at least 2 characters.';
    }
    if (!code.trim() || code.trim().length < 2) {
      errors.code = 'State Code must be at least 2 characters.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/super-admin/states/${params.id}`;

      const response = await fetchJson(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country_id: countryId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          is_active: isActive,
        }),
      });

      if (response.ok) {
        showSuccess(response.data?.message || 'State updated successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Failed to save state details.');
      }
    } catch {
      showError('Network error saving state.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Update State Details"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          <View style={styles.formContainer}>
          <Text variant="titleMedium" style={styles.formTitle}>
            Modify State Registry
          </Text>

          {/* Country Selector Field (Dropdown UI) */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              Country
            </Text>
            <Pressable onPress={() => setCountryPickerVisible(true)}>
              <View pointerEvents="none">
                <TextInput
                  value={countryName}
                  mode="outlined"
                  placeholder="Select Country"
                  placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                  textColor={theme.colors.onSurface}
                  editable={false}
                  outlineColor={fieldErrors.country ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                  activeOutlineColor={fieldErrors.country ? theme.colors.error : theme.colors.primary}
                  right={<TextInput.Icon icon="chevron-down" color={theme.colors.onSurfaceVariant} />}
                />
              </View>
            </Pressable>
            {fieldErrors.country ? (
              <Text variant="bodySmall" style={styles.errorText}>
                {fieldErrors.country}
              </Text>
            ) : null}
          </View>

          {/* State Name */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              State Name
            </Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
              }}
              mode="outlined"
              placeholder="E.g., California, Ontario"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              textColor={theme.colors.onSurface}
              outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
              activeOutlineColor={fieldErrors.name ? theme.colors.error : theme.colors.primary}
            />
            {fieldErrors.name ? (
              <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.name}</Text>
            ) : null}
          </View>

          {/* State Code */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              State Code
            </Text>
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v);
                if (fieldErrors.code) setFieldErrors((e) => ({ ...e, code: undefined }));
              }}
              mode="outlined"
              placeholder="E.g., CA, ON"
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

      {/* Country Search Picker Modal Dialog */}
      <Portal>
        <Dialog
          visible={countryPickerVisible}
          onDismiss={() => setCountryPickerVisible(false)}
          style={[styles.dialog, { maxHeight: '80%' }]}
        >
          <Dialog.Title style={{ fontWeight: '800', textAlign: 'center' }}>Select Country</Dialog.Title>
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Searchbar
              placeholder="Search country..."
              onChangeText={setCountrySearch}
              value={countrySearch}
              style={styles.pickerSearchbar}
              inputStyle={{ minHeight: 0 }}
              iconColor={theme.colors.onSurfaceVariant}
              clearIcon={(p) => <MaterialCommunityIcons name="close" size={20} color={p.color} />}
              onClearIconPress={() => setCountrySearch('')}
            />
          </View>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCountryId(String(item.id));
                    setCountryName(item.name);
                    setFieldErrors((prev) => ({ ...prev, country: undefined }));
                    setCountryPickerVisible(false);
                    setCountrySearch('');
                  }}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    pressed && { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Avatar.Text
                    size={28}
                    label={item.code.substring(0, 2)}
                    style={{ backgroundColor: theme.colors.secondaryContainer }}
                    labelStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 11, fontWeight: '700' }}
                  />
                  <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '500', color: theme.colors.onSurface }}>
                    {item.name} ({item.code})
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>No active countries found</Text>
                </View>
              }
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => { setCountryPickerVisible(false); setCountrySearch(''); }}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Centralized saving overlay */}
      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Updating state details..." icon="database-sync-outline" transparent />
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
    dialog: {
      backgroundColor: theme.colors.elevation.level3,
      borderRadius: 16,
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      margin: 16,
    },
    pickerSearchbar: {
      elevation: 0,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      height: 40,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
  });
