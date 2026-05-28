// frontend/app/(app)/super-admin/countries.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable } from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Dialog,
  Portal,
  TextInput,
  Switch,
  FAB,
  Searchbar,
  useTheme,
  Avatar,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

type Country = {
  id: string;
  uuid: string;
  name: string;
  code: string;
  phone_code: string | null;
  is_active: boolean;
};

export default function CountriesRegistry() {
  const theme = useTheme();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCountries = async (query = '') => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = query
        ? `${API_BASE_URL}/super-admin/countries?search=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/super-admin/countries`;

      const response = await fetchJson(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok && response.data) {
        setCountries(response.data.data || []);
      } else {
        showError(response.data?.message || 'Failed to load countries');
      }
    } catch {
      showError('Network error loading countries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries(search);
  }, [search]);

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setCode('');
    setPhoneCode('');
    setIsActive(true);
    setDialogVisible(true);
  };

  const handleOpenEdit = (item: Country) => {
    setEditId(item.id);
    setName(item.name);
    setCode(item.code);
    setPhoneCode(item.phone_code || '');
    setIsActive(item.is_active);
    setDialogVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      showError('Name and Code are required.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = editId
        ? `${API_BASE_URL}/super-admin/countries/${editId}`
        : `${API_BASE_URL}/super-admin/countries`;
      const method = editId ? 'PUT' : 'POST';

      const response = await fetchJson(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          phone_code: phoneCode.trim() || null,
          is_active: isActive,
        }),
      });

      if (response.ok) {
        showSuccess(response.data?.message || 'Country saved successfully');
        setDialogVisible(false);
        fetchCountries(search);
      } else {
        // Handle duplicate record conflict or validation message
        showError(response.data?.message || 'Failed to save country details.');
      }
    } catch {
      showError('Network error saving country.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: Country, newStatus: boolean) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/super-admin/countries/${item.id}/status`;

      // Update locally first for smooth UI UX
      setCountries((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: newStatus } : c))
      );

      const response = await fetchJson(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) {
        // Rollback
        setCountries((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, is_active: !newStatus } : c))
        );
        showError(response.data?.message || 'Failed to update status.');
      } else {
        showSuccess(response.data?.message || 'Status updated.');
      }
    } catch {
      // Rollback
      setCountries((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: !newStatus } : c))
      );
      showError('Network error updating status.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Countries Registry" showBack onBackPress={() => router.back()} />

      <View style={styles.headerBar}>
        <Searchbar
          placeholder="Search by name or code..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchbar}
          inputStyle={{ minHeight: 0 }}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator animating color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={countries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="earth-off" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
              <Text variant="bodyLarge" style={styles.emptyText}>
                No countries registered yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => handleOpenEdit(item)}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Avatar.Text
                    size={36}
                    label={item.code.substring(0, 2)}
                    style={{ backgroundColor: theme.colors.secondaryContainer }}
                    labelStyle={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                      {item.name}
                    </Text>
                    <View style={styles.subDetailRow}>
                      <Text variant="bodySmall" style={styles.detailLabel}>Code: </Text>
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>{item.code}</Text>
                      {item.phone_code && (
                        <>
                          <Text variant="bodySmall" style={[styles.detailLabel, { marginLeft: 10 }]}>Dial: </Text>
                          <Text variant="bodySmall" style={{ fontWeight: '600' }}>{item.phone_code}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.switchCol}>
                    <Switch
                      value={item.is_active}
                      onValueChange={(val) => handleToggleStatus(item, val)}
                      color={theme.colors.primary}
                    />
                    <Text variant="bodySmall" style={[styles.statusText, { color: item.is_active ? theme.colors.primary : theme.colors.error }]}>
                      {item.is_active ? 'Active' : 'Disabled'}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
        />
      )}

      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} color="#ffffff" onPress={handleOpenAdd} label="Add Country" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title style={{ fontWeight: '800' }}>
            {editId ? 'Modify Country Details' : 'Register New Country'}
          </Dialog.Title>
          <Dialog.Content style={{ gap: 14 }}>
            <TextInput
              label="Country Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              placeholder="E.g., India, United States"
            />
            <TextInput
              label="ISO Abbreviated Code"
              value={code}
              onChangeText={setCode}
              mode="outlined"
              placeholder="E.g., IN, US"
              autoCapitalize="characters"
              maxLength={10}
            />
            <TextInput
              label="Phone Dial Code"
              value={phoneCode}
              onChangeText={setPhoneCode}
              mode="outlined"
              placeholder="E.g., +91, +1"
            />
            <View style={styles.dialogSwitchRow}>
              <Text variant="bodyMedium">Mark Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onPress={handleSave} loading={saving} disabled={saving} mode="contained">
              Save Country
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 44,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 88,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailLabel: {
    opacity: 0.6,
  },
  switchCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  dialogSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
});
