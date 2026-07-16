import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Keyboard,
  useWindowDimensions,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  MD3Theme,
  Portal,
  TextInput,
  Divider,
  TouchableRipple,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

// ─── Types ───────────────────────────────────────────────────────────────────

type Option = {
  id: string | number;
  name: string;
  country_id?: string | number;
  state_id?: string | number;
};

type CacheKey = 'countries' | 'states' | 'cities' | 'roles';

// ─── Selection Modal (with Search) ────────────────────────────────────────────

function SelectionModal({
  visible,
  title,
  options,
  loading,
  onSelect,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  loading: boolean;
  onSelect: (opt: Option) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  const styles = StyleSheet.create({
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
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 20,
      padding: 16,
    },
    modalTitle: { fontWeight: '800', color: theme.colors.onSurface, textAlign: 'center', marginBottom: 8 },
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
    emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 20 },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={styles.card}>
            <Text variant="titleMedium" style={styles.modalTitle}>{title}</Text>

            {/* Compact Search bar */}
            <View style={styles.searchWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                mode="flat"
                placeholder={`Search ${title.replace('Select ', '')}...`}
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                style={[styles.searchField, { backgroundColor: 'transparent' }]}
              />
              {!!search && (
                <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
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
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 300 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableRipple
                    onPress={() => { onSelect(item); onDismiss(); }}
                    style={styles.optionItem}
                    rippleColor={theme.colors.secondaryContainer}
                  >
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{item.name}</Text>
                  </TouchableRipple>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {search ? `No results for "${search}"` : 'No items available.'}
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
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Field Label Component ────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
        {required && <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>* </Text>}
        {label}
      </Text>
      {children}
      {error && (
        <Text variant="bodySmall" style={{ color: theme.colors.error, fontSize: 12, marginTop: 2 }}>
          {error}
        </Text>
      )}
    </View>
  );
}

// ─── Selector Trigger Component ───────────────────────────────────────────────

function SelectorTrigger({
  value,
  placeholder,
  hasError,
  disabled,
  onPress,
  theme,
}: {
  value?: string;
  placeholder: string;
  hasError?: boolean;
  disabled?: boolean;
  onPress: () => void;
  theme: MD3Theme;
}) {
  const disabledInputStyle = {
    opacity: 0.75,
    backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  };

  return (
    <Pressable onPress={disabled ? undefined : onPress} style={{ width: '100%' }}>
      <View pointerEvents="none" style={{ width: '100%' }}>
        <TextInput
          value={value ?? ''}
          mode="outlined"
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
          right={disabled ? undefined : <TextInput.Icon icon="chevron-down" />}
          outlineColor={hasError ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
          activeOutlineColor={theme.colors.primary}
          disabled={disabled}
          style={[{ width: '100%' }, disabled && disabledInputStyle]}
        />
      </View>
    </Pressable>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AddUserPage() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formAddress, setFormAddress] = useState('');

  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Selected values
  const [selectedRole, setSelectedRole] = useState<Option | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Option | null>(null);
  const [selectedState, setSelectedState] = useState<Option | null>(null);
  const [selectedCity, setSelectedCity] = useState<Option | null>(null);

  // In-session cache
  const cache = useRef<Partial<Record<CacheKey, Option[]>>>({});

  // Selection Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalOptions, setModalOptions] = useState<Option[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [onSelectCallback, setOnSelectCallback] = useState<(opt: Option) => void>(() => {});

  // Validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getToken = async () => AsyncStorage.getItem('companyToken');

  const fetchAndOpen = useCallback(
    async (
      key: CacheKey,
      title: string,
      endpoint: string,
      mapFn: (raw: any[]) => Option[],
      onSelect: (opt: Option) => void,
      extraFilter?: (o: Option) => boolean,
    ) => {
      setModalTitle(title);
      setOnSelectCallback(() => onSelect);
      setModalVisible(true);

      if (cache.current[key]) {
        const data = extraFilter
          ? (cache.current[key] as Option[]).filter(extraFilter)
          : (cache.current[key] as Option[]);
        setModalOptions(data);
        setModalLoading(false);
        return;
      }

      setModalLoading(true);
      setModalOptions([]);
      try {
        const token = await getToken();
        const res = await fetchJson(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && res.data) {
          const rawList = res.data.data || [];
          let mapped = mapFn(rawList);
          if (key === 'roles') {
            mapped = mapped.filter((r) => r.name.toUpperCase() !== 'ADMIN');
          }
          cache.current[key] = mapped;
          const display = extraFilter ? mapped.filter(extraFilter) : mapped;
          setModalOptions(display);
        } else {
          showError(`Failed to load ${title}`);
        }
      } catch {
        showError(`Network error loading ${title}`);
      } finally {
        setModalLoading(false);
      }
    },
    [showError],
  );

  const openRoles = () =>
    fetchAndOpen(
      'roles',
      'Select Role',
      `${API_BASE_URL}/company/roles`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name })),
      (opt) => {
        setSelectedRole(opt);
        clearErr('role');
      },
    );

  const openCountries = () =>
    fetchAndOpen(
      'countries',
      'Select Country',
      `${API_BASE_URL}/company/countries?limit=250`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name })),
      (opt) => {
        setSelectedCountry(opt);
        setSelectedState(null);
        setSelectedCity(null);
        clearErr('country');
      },
    );

  const openStates = () => {
    if (!selectedCountry) return;
    fetchAndOpen(
      'states',
      'Select State',
      `${API_BASE_URL}/company/states?limit=1000&country_id=${selectedCountry.id}`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name, country_id: r.country_id })),
      (opt) => {
        setSelectedState(opt);
        setSelectedCity(null);
        clearErr('state');
      },
      (o) => String(o.country_id) === String(selectedCountry.id),
    );
  };

  const openCities = () => {
    if (!selectedState) return;
    fetchAndOpen(
      'cities',
      'Select City',
      `${API_BASE_URL}/company/cities?limit=1000&state_id=${selectedState.id}`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name, state_id: r.state_id })),
      (opt) => {
        setSelectedCity(opt);
        clearErr('city');
      },
      (o) => String(o.state_id) === String(selectedState.id),
    );
  };

  function clearErr(key: string) {
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Name is required.';
    if (!formEmail.trim() || !/^\S+@\S+\.\S+$/.test(formEmail)) errors.email = 'Valid email is required.';
    if (!password.trim() || password.trim().length < 8) errors.password = 'Password must be at least 8 characters.';
    if (password && confirmPassword && password !== confirmPassword) errors.confirm_password = 'Passwords do not match.';
    if (!formMobile.trim()) errors.mobile = 'Mobile is required.';
    if (!selectedRole) errors.role = 'Role is required.';
    if (!selectedCountry) errors.country = 'Country is required.';
    if (!selectedState) errors.state = 'State is required.';
    if (!selectedCity) errors.city = 'City is required.';
    if (!formAddress.trim()) errors.address = 'Address is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showError('Please check form validation errors.');
      return;
    }

    setFieldErrors({});
    setSaving(true);
    Keyboard.dismiss();

    try {
      const token = await getToken();
      const payload = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: password.trim(),
        mobile: formMobile.trim(),
        country_id: Number(selectedCountry.id),
        country_name: selectedCountry.name,
        state_id: Number(selectedState.id),
        state_name: selectedState.name,
        city_id: Number(selectedCity.id),
        city_name: selectedCity.name,
        address: formAddress.trim(),
        role_id: Number(selectedRole.id),
      };

      const response = await fetchJson(`${API_BASE_URL}/company/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showSuccess('User registered successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Failed to register user.');
      }
    } catch {
      showError('Network error registering user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Add Team Member"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.formCard, isLargeScreen && { alignSelf: 'center', width: '70%', maxWidth: 700 }]}>
          <Text variant="titleLarge" style={styles.formTitle}>
            Member Details
          </Text>

          <View style={{ gap: 16 }}>
            {/* Name */}
            <Field label="Full Name" required error={fieldErrors.name}>
              <TextInput
                value={formName}
                onChangeText={(v) => { setFormName(v); clearErr('name'); }}
                mode="outlined"
                placeholder="Enter full name"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                error={!!fieldErrors.name}
                outlineColor={fieldErrors.name ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={theme.colors.primary}
              />
            </Field>

            {/* Email */}
            <Field label="Email Address" required error={fieldErrors.email}>
              <TextInput
                value={formEmail}
                onChangeText={(v) => { setFormEmail(v); clearErr('email'); }}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter email address"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                error={!!fieldErrors.email}
                outlineColor={fieldErrors.email ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={theme.colors.primary}
              />
            </Field>

            {/* Password */}
            <Field label="New Password" required error={fieldErrors.password}>
              <TextInput
                value={password}
                onChangeText={(v) => { setPassword(v); clearErr('password'); }}
                secureTextEntry={!showPassword}
                mode="outlined"
                placeholder="Enter new password"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                error={!!fieldErrors.password}
                right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
                outlineColor={fieldErrors.password ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={theme.colors.primary}
              />
            </Field>

            {/* Confirm Password */}
            <Field label="Confirm Password" required error={fieldErrors.confirm_password}>
              <TextInput
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearErr('confirm_password'); }}
                secureTextEntry={!showConfirmPassword}
                mode="outlined"
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                error={!!fieldErrors.confirm_password}
                right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off' : 'eye'} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />}
                outlineColor={fieldErrors.confirm_password ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={theme.colors.primary}
              />
            </Field>

            {/* Mobile */}
            <Field label="Mobile Number" required error={fieldErrors.mobile}>
              <TextInput
                value={formMobile}
                onChangeText={(v) => { setFormMobile(v); clearErr('mobile'); }}
                mode="outlined"
                keyboardType="phone-pad"
                placeholder="Enter mobile number"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                error={!!fieldErrors.mobile}
                outlineColor={fieldErrors.mobile ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={theme.colors.primary}
              />
            </Field>

            {/* Role Trigger */}
            <Field label="Role" required error={fieldErrors.role}>
              <SelectorTrigger
                value={selectedRole?.name}
                placeholder="Tap to select Role..."
                hasError={!!fieldErrors.role}
                onPress={openRoles}
                theme={theme}
              />
            </Field>

            {/* Country Trigger */}
            <Field label="Country" required error={fieldErrors.country}>
              <SelectorTrigger
                value={selectedCountry?.name}
                placeholder="Tap to select Country..."
                hasError={!!fieldErrors.country}
                onPress={openCountries}
                theme={theme}
              />
            </Field>

            {/* State Trigger */}
            <Field label="State" required error={fieldErrors.state}>
              <SelectorTrigger
                value={selectedState?.name}
                placeholder={selectedCountry ? 'Tap to select State...' : 'Select Country first...'}
                hasError={!!fieldErrors.state}
                disabled={!selectedCountry}
                onPress={openStates}
                theme={theme}
              />
            </Field>

            {/* City Trigger */}
            <Field label="City" required error={fieldErrors.city}>
              <SelectorTrigger
                value={selectedCity?.name}
                placeholder={selectedState ? 'Tap to select City...' : 'Select State first...'}
                hasError={!!fieldErrors.city}
                disabled={!selectedState}
                onPress={openCities}
                theme={theme}
              />
            </Field>

            {/* Address */}
            <Field label="Address" required error={fieldErrors.address}>
              <TextInput
                value={formAddress}
                onChangeText={(v) => { setFormAddress(v); clearErr('address'); }}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Enter address details"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                error={!!fieldErrors.address}
                outlineColor={fieldErrors.address ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                activeOutlineColor={theme.colors.primary}
              />
            </Field>
          </View>

          {/* Form Actions: Stacked vertically with centered submit */}
          <View style={styles.formActions}>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={saving}
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
              style={styles.saveButton}
            >
              Register Member
            </Button>
            <Button
              mode="text"
              onPress={() => !saving && router.back()}
              disabled={saving}
              style={styles.cancelButton}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Selector Modal Overlay */}
      <SelectionModal
        visible={modalVisible}
        title={modalTitle}
        options={modalOptions}
        loading={modalLoading}
        onSelect={onSelectCallback}
        onDismiss={() => setModalVisible(false)}
      />

      {/* Centralized Save Loader Overlay */}
      {saving && (
        <Portal>
          <View style={styles.loaderBackdrop}>
            <AppLoader message="Registering team member..." icon="database-sync-outline" transparent />
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
    formCard: {
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      padding: 20,
      elevation: 2,
    },
    formTitle: {
      fontWeight: '700',
      marginBottom: 20,
      color: theme.colors.primary,
    },
    formActions: {
      marginTop: 28,
      gap: 12,
    },
    saveButton: {
      minWidth: 140,
      borderRadius: 12,
      alignSelf: 'center',
    },
    cancelButton: {
      alignSelf: 'flex-end',
    },
    loaderBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
  });
