// frontend/app/(app)/super-admin/cities/add.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, FlatList, useWindowDimensions } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Dialog,
  Portal,
  Avatar,
  Searchbar,
  useTheme,
  MD3Theme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

type StateItem = {
  id: string;
  name: string;
  code: string;
  country_name: string;
  is_active: boolean;
};

export default function AddCity() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [states, setStates] = useState<StateItem[]>([]);
  const [stateId, setStateId] = useState('');
  const [stateName, setStateName] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; state?: string }>({});

  // State Picker Modal state
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  const fetchStates = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetchJson(`${API_BASE_URL}/super-admin/states`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && response.data) {
        const activeList = (response.data.data || []).filter((s: any) => s.is_active);
        setStates(activeList);
      }
    } catch (err) {
      console.error('Error fetching states list', err);
    }
  };

  useEffect(() => {
    fetchStates();
  }, []);

  const handleSave = async () => {
    const errors: { name?: string; state?: string } = {};
    if (!stateId) {
      errors.state = 'State selection is required.';
    }
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'City Name must be at least 2 characters.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/super-admin/cities`;

      const response = await fetchJson(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state_id: stateId,
          name: name.trim(),
          is_active: true, // Default to active
        }),
      });

      if (response.ok) {
        showSuccess(response.data?.message || 'City registered successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Failed to save city details.');
      }
    } catch {
      showError('Network error saving city.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStates = states.filter((s) =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(stateSearch.toLowerCase()) ||
    s.country_name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Register New City"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          <View style={styles.formContainer}>
          <Text variant="titleMedium" style={styles.formTitle}>
            Enter City Details
          </Text>

          {/* State Selector Field (Dropdown UI) */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              State
            </Text>
            <Pressable onPress={() => setStatePickerVisible(true)}>
              <View pointerEvents="none">
                <TextInput
                  value={stateName}
                  mode="outlined"
                  placeholder="Select State"
                  placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                  textColor={theme.colors.onSurface}
                  editable={false}
                  outlineColor={fieldErrors.state ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                  activeOutlineColor={fieldErrors.state ? theme.colors.error : theme.colors.primary}
                  right={<TextInput.Icon icon="chevron-down" color={theme.colors.onSurfaceVariant} />}
                />
              </View>
            </Pressable>
            {fieldErrors.state ? (
              <Text variant="bodySmall" style={styles.errorText}>
                {fieldErrors.state}
              </Text>
            ) : null}
          </View>

          {/* City Name */}
          <View style={styles.fieldRow}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>
              City Name
            </Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
              }}
              mode="outlined"
              placeholder="E.g., San Francisco, Toronto"
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

      {/* State Search Picker Dialog */}
      <Portal>
        <Dialog
          visible={statePickerVisible}
          onDismiss={() => setStatePickerVisible(false)}
          style={[styles.dialog, { maxHeight: '80%' }]}
        >
          <Dialog.Title style={{ fontWeight: '800', textAlign: 'center' }}>Select State</Dialog.Title>
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Searchbar
              placeholder="Search state..."
              onChangeText={setStateSearch}
              value={stateSearch}
              style={styles.pickerSearchbar}
              inputStyle={{ minHeight: 0 }}
              iconColor={theme.colors.onSurfaceVariant}
              clearIcon={(p) => <MaterialCommunityIcons name="close" size={20} color={p.color} />}
              onClearIconPress={() => setStateSearch('')}
            />
          </View>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setStateId(String(item.id));
                    setStateName(`${item.name} (${item.country_name})`);
                    setFieldErrors((prev) => ({ ...prev, state: undefined }));
                    setStatePickerVisible(false);
                    setStateSearch('');
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
                    {item.name} ({item.code}) — {item.country_name}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>No active states found</Text>
                </View>
              }
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => { setStatePickerVisible(false); setStateSearch(''); }}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Centralized saving overlay */}
      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Registering new city..." icon="database-sync-outline" transparent />
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
