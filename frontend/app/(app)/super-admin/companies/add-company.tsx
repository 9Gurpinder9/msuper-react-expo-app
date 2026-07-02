// frontend/app/(app)/super-admin/companies/add.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  useTheme,
  MD3Theme,
  Portal,
  Surface,
  Divider,
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
  duration_days?: number;
};

type CacheKey = 'countries' | 'states' | 'cities' | 'categories' | 'plans';

// ─── Date Helpers ─────────────────────────────────────────────────────────────

const parseISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

const toISO = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toDisplay = (input: Date | string): string => {
  const d = typeof input === 'string' ? parseISO(input) : input;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
};

const calcExpiryISO = (validityISO: string, durationDays: number): string => {
  const d = parseISO(validityISO);
  d.setDate(d.getDate() + durationDays);
  return toISO(d);
};

const todayISO = (): string => toISO(new Date());

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

// ─── Custom Date Picker Modal ─────────────────────────────────────────────────

function DatePickerModal({
  visible,
  currentISO,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  currentISO: string;
  onConfirm: (iso: string) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const parsed = parseISO(currentISO);
  const [year, setYear] = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth()); // 0-indexed
  const [day, setDay] = useState(parsed.getDate());

  // Clamp day when month/year changes
  useEffect(() => {
    const maxDay = daysInMonth(year, month);
    if (day > maxDay) setDay(maxDay);
  }, [year, month]);

  const maxDay = daysInMonth(year, month);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 340,
    },
    title: {
      fontWeight: '800',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: 16,
      fontSize: 16,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    fieldLabel: { color: theme.colors.onSurfaceVariant, fontWeight: '700', fontSize: 12, width: 60 },
    arrowBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
      borderRadius: 8, backgroundColor: theme.colors.surfaceVariant },
    valueText: {
      flex: 1, textAlign: 'center', fontWeight: '700',
      fontSize: 15, color: theme.colors.onSurface,
    },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Surface style={styles.card} elevation={4}>
            <Text style={styles.title}>Select Date</Text>

            {/* Day row */}
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Day</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setDay((d) => Math.max(1, d - 1))}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.valueText}>{String(day).padStart(2, '0')}</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setDay((d) => Math.min(maxDay, d + 1))}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Month row */}
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Month</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setMonth((m) => (m - 1 + 12) % 12)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.valueText}>{MONTHS[month]}</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setMonth((m) => (m + 1) % 12)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Year row */}
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Year</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setYear((y) => y - 1)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.valueText}>{year}</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setYear((y) => y + 1)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 12 }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
                {String(day).padStart(2, '0')}-{String(month + 1).padStart(2, '0')}-{year}
              </Text>
            </View>

            <Divider />
            <View style={styles.actions}>
              <Button mode="text" onPress={onDismiss} textColor={theme.colors.onSurfaceVariant}>Cancel</Button>
              <Button
                mode="contained"
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onSecondary}
                onPress={() => {
                  const d = new Date(year, month, day, 12, 0, 0);
                  onConfirm(toISO(d));
                }}
              >
                Confirm
              </Button>
            </View>
          </Surface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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

  // Reset search whenever modal opens
  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  const styles = StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    card: {
      width: '100%', maxWidth: 360,
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF', borderRadius: 20, padding: 16,
    },
    modalTitle: { fontWeight: '800', color: theme.colors.onSurface, textAlign: 'center', marginBottom: 8 },
    searchWrapper: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
      borderRadius: 10, paddingHorizontal: 10, height: 42, marginBottom: 10,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    },
    searchIcon: { fontSize: 16, color: theme.colors.onSurfaceVariant, marginRight: 6 },
    searchField: {
      flex: 1, fontSize: 14, color: theme.colors.onSurface,
      paddingVertical: 0, paddingHorizontal: 0,
    },
    clearBtn: { padding: 4 },
    optionItem: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
    emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 20 },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Surface style={styles.card} elevation={4}>
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
                testID="selector-search-input"
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
                  <Pressable
                    style={({ pressed }) => [
                      styles.optionItem,
                      pressed && { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                    onPress={() => { onSelect(item); onDismiss(); }}
                    testID={`select-option-${item.id}`}
                  >
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{item.name}</Text>
                  </Pressable>
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
          </Surface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function AddCompanyPage() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [saving, setSaving] = useState(false);

  // Refs for ScrollView and Inputs
  const scrollViewRef = useRef<ScrollView>(null);
  const gstInputRef = useRef<any>(null);
  const printNameInputRef = useRef<any>(null);
  const address1InputRef = useRef<any>(null);
  const address2InputRef = useRef<any>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollY = useRef(0);

  // Keyboard scrolling shift handler using absolute measure
  const handleFocus = (ref: any, offset = 50) => {
    setTimeout(() => {
      ref?.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        (scrollViewRef.current as any)?.measure((sx: number, sy: number, sw: number, sh: number, spx: number, spy: number) => {
          const elementYInContent = pageY - spy + scrollY.current;
          scrollViewRef.current?.scrollTo({ y: Math.max(0, elementYInContent - offset), animated: true });
        });
      });
    }, 150); // 150ms timeout ensures keyboard resizing and layout updates are applied
  };

  // Form fields
  const [ownerName, setOwnerName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile1, setMobile1] = useState('');
  const [mobile2, setMobile2] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [printName, setPrintName] = useState('');

  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dates
  const [validityDateISO, setValidityDateISO] = useState(todayISO());
  const [expiryDateISO, setExpiryDateISO] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Selections
  const [selectedCountry, setSelectedCountry] = useState<Option | null>(null);
  const [selectedState, setSelectedState] = useState<Option | null>(null);
  const [selectedCity, setSelectedCity] = useState<Option | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Option | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Option | null>(null);

  // Lazy-loaded lists & their loading flags
  const [countriesList, setCountriesList] = useState<Option[]>([]);
  const [statesList, setStatesList] = useState<Option[]>([]);
  const [citiesList, setCitiesList] = useState<Option[]>([]);
  const [categoriesList, setCategoriesList] = useState<Option[]>([]);
  const [plansList, setPlansList] = useState<Option[]>([]);

  // In-memory cache — data fetched once per session
  const cache = useRef<Partial<Record<CacheKey, Option[]>>>({});
  const [fetchingKey, setFetchingKey] = useState<CacheKey | null>(null);

  // Selection modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalOptions, setModalOptions] = useState<Option[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [onSelectCallback, setOnSelectCallback] = useState<(opt: Option) => void>(() => {});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Recalculate expiry whenever validity or plan changes ──────────────────
  useEffect(() => {
    if (selectedPlan?.duration_days && selectedPlan.duration_days > 0) {
      setExpiryDateISO(calcExpiryISO(validityDateISO, selectedPlan.duration_days));
    } else {
      setExpiryDateISO('');
    }
  }, [validityDateISO, selectedPlan]);

  // ── Lazy fetch helper ─────────────────────────────────────────────────────
  const getToken = async () => AsyncStorage.getItem('authToken');

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

      // Serve from cache if available
      if (cache.current[key]) {
        const data = extraFilter
          ? (cache.current[key] as Option[]).filter(extraFilter)
          : (cache.current[key] as Option[]);
        setModalOptions(data);
        setModalLoading(false);
        return;
      }

      // Fetch from API
      setModalLoading(true);
      setModalOptions([]);
      try {
        const token = await getToken();
        const res = await fetchJson(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && res.data) {
          const mapped = mapFn(res.data.data || []);
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

  // ── Per-field openers ─────────────────────────────────────────────────────
  const openCategories = () =>
    fetchAndOpen(
      'categories',
      'Select Category',
      `${API_BASE_URL}/super-admin/company-categories?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name })),
      (opt) => setSelectedCategory(opt),
    );

  const openCountries = () =>
    fetchAndOpen(
      'countries',
      'Select Country',
      `${API_BASE_URL}/super-admin/countries?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name })),
      (opt) => {
        setSelectedCountry(opt);
        setSelectedState(null);
        setSelectedCity(null);
      },
    );

  const openStates = () => {
    if (!selectedCountry) return;
    fetchAndOpen(
      'states',
      'Select State',
      `${API_BASE_URL}/super-admin/states?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name, country_id: r.country_id })),
      (opt) => {
        setSelectedState(opt);
        setSelectedCity(null);
      },
      (o) => String(o.country_id) === String(selectedCountry.id),
    );
  };

  const openCities = () => {
    if (!selectedState) return;
    fetchAndOpen(
      'cities',
      'Select City',
      `${API_BASE_URL}/super-admin/cities?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name, state_id: r.state_id })),
      (opt) => setSelectedCity(opt),
      (o) => String(o.state_id) === String(selectedState.id),
    );
  };

  const openPlans = () =>
    fetchAndOpen(
      'plans',
      'Select Plan',
      `${API_BASE_URL}/super-admin/subscription-plans?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name, duration_days: r.duration_days ?? 0 })),
      (opt) => setSelectedPlan(opt),
    );

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!ownerName.trim()) errors.owner_name = 'Owner name is required.';
    if (!name.trim()) errors.name = 'Company name is required.';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Valid email is required.';
    if (!mobile1.trim()) errors.mobile1 = 'Primary mobile is required.';
    if (!selectedCountry) errors.country = 'Country selection is required.';
    if (!selectedState) errors.state = 'State selection is required.';
    if (!selectedCity) errors.city = 'City selection is required.';
    if (!selectedCategory) errors.category = 'Category selection is required.';
    if (!password.trim()) {
      errors.password = 'Password is required to create the default ADMIN user.';
    } else {
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordPattern.test(password)) {
        errors.password = 'Must be at least 8 characters and contain uppercase, lowercase, number, and special character.';
      }
    }
    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirm_password = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showError('Please fill out the highlighted fields.');
      return;
    }
    setFieldErrors({});
    setSaving(true);

    try {
      const token = await getToken();
      const response = await fetchJson(`${API_BASE_URL}/super-admin/companies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_name: ownerName.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          mobile1: mobile1.trim(),
          mobile2: mobile2.trim() || null,
          country_id: selectedCountry?.id,
          country_name: selectedCountry?.name,
          state_id: selectedState?.id,
          state_name: selectedState?.name,
          city_id: selectedCity?.id,
          city_name: selectedCity?.name,
          category_id: selectedCategory?.id,
          category_name: selectedCategory?.name,
          plan_id: selectedPlan?.id,
          gst_no: gstNo.trim() || null,
          address1: address1.trim() || null,
          address2: address2.trim() || null,
          print_name: printName.trim() || null,
          validity_date: validityDateISO,
          expiry_date: expiryDateISO || validityDateISO,
          is_active: true,
          password: password.trim(),
          confirm_password: confirmPassword.trim(),
        }),
      });

      if (response.ok) {
        showSuccess('Company registered successfully');
        const companyId = response.data?.data?.id;
        if (companyId) {
          router.replace(`/super-admin/companies/menu-permissions?companyId=${companyId}`);
        } else {
          router.back();
        }
      } else {
        showError(response.data?.message || 'Failed to save company.');
      }
    } catch {
      showError('Network error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Register New Company" showBack onBackPress={() => router.back()} />

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 60 }]}
        automaticallyAdjustKeyboardInsets={true}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          {/* ── Organisation Details ─────────────────────────────────────── */}
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Organization Details</Text>

            <Field label="Company Name" required error={!!fieldErrors.name}>
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); clearErr('name'); }}
                mode="outlined"
                placeholder="e.g. Acme Corp"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.name ? theme.colors.error : outlineColor(theme)}
                testID="company-name-input"
              />
            </Field>

            <Field label="Owner Full Name" required error={!!fieldErrors.owner_name}>
              <TextInput
                value={ownerName}
                onChangeText={(v) => { setOwnerName(v); clearErr('owner_name'); }}
                mode="outlined"
                placeholder="e.g. John Doe"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.owner_name ? theme.colors.error : outlineColor(theme)}
                testID="owner-name-input"
              />
            </Field>

            <Field label="Email Address" required error={!!fieldErrors.email}>
              <TextInput
                value={email}
                onChangeText={(v) => { setEmail(v); clearErr('email'); }}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="e.g. support@acme.com"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.email ? theme.colors.error : outlineColor(theme)}
                testID="company-email-input"
              />
            </Field>

            <Field label="Primary Mobile" required error={!!fieldErrors.mobile1}>
              <TextInput
                value={mobile1}
                onChangeText={(v) => { setMobile1(v); clearErr('mobile1'); }}
                mode="outlined"
                keyboardType="phone-pad"
                placeholder="e.g. 9876543210"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.mobile1 ? theme.colors.error : outlineColor(theme)}
                testID="company-mobile1-input"
              />
            </Field>

            <Field label="Secondary Mobile">
              <TextInput
                value={mobile2}
                onChangeText={setMobile2}
                mode="outlined"
                keyboardType="phone-pad"
                placeholder="e.g. 9876543211"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={outlineColor(theme)}
                testID="company-mobile2-input"
              />
            </Field>
          </Surface>

          {/* ── Location & Classification ────────────────────────────────── */}
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Location & Classification</Text>

            <Field label="Company Category" required error={!!fieldErrors.category}>
              <SelectorTrigger
                value={selectedCategory?.name}
                placeholder="Tap to select Category..."
                hasError={!!fieldErrors.category}
                onPress={openCategories}
                theme={theme}
                testID="select-category-trigger"
              />
            </Field>

            <Field label="Country" required error={!!fieldErrors.country}>
              <SelectorTrigger
                value={selectedCountry?.name}
                placeholder="Tap to select Country..."
                hasError={!!fieldErrors.country}
                onPress={openCountries}
                theme={theme}
                testID="select-country-trigger"
              />
            </Field>

            <Field label="State" required error={!!fieldErrors.state}>
              <SelectorTrigger
                value={selectedState?.name}
                placeholder={selectedCountry ? 'Tap to select State...' : 'Select Country first...'}
                hasError={!!fieldErrors.state}
                disabled={!selectedCountry}
                onPress={openStates}
                theme={theme}
                testID="select-state-trigger"
              />
            </Field>

            <Field label="City" required error={!!fieldErrors.city}>
              <SelectorTrigger
                value={selectedCity?.name}
                placeholder={selectedState ? 'Tap to select City...' : 'Select State first...'}
                hasError={!!fieldErrors.city}
                disabled={!selectedState}
                onPress={openCities}
                theme={theme}
                testID="select-city-trigger"
              />
            </Field>
          </Surface>

          {/* ── Subscription & Validity ──────────────────────────────────── */}
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Subscription & Validity</Text>

            <Field label="Subscription Plan" required error={!!fieldErrors.plan}>
              <SelectorTrigger
                value={selectedPlan?.name}
                placeholder="Tap to select Subscription Plan..."
                hasError={!!fieldErrors.plan}
                onPress={openPlans}
                theme={theme}
                testID="select-plan-trigger"
              />
            </Field>

            {/* Validity / Start Date */}
            <Field label="Subscription Start Date" required>
              <Pressable onPress={() => setShowDatePicker(true)} testID="validity-date-trigger">
                <View pointerEvents="none">
                  <TextInput
                    value={toDisplay(validityDateISO)}
                    mode="outlined"
                    editable={false}
                    placeholder="DD-MM-YYYY"
                    right={<TextInput.Icon icon="calendar" />}
                    outlineColor={outlineColor(theme)}
                    testID="validity-date-input"
                  />
                </View>
              </Pressable>
            </Field>

            {/* Expiry Date — read-only */}
            <Field
              label="Expiry Date"
              hint={
                selectedPlan?.duration_days
                  ? `Auto-calculated · ${selectedPlan.duration_days} days from start`
                  : 'Auto-calculated after plan selection'
              }
            >
              <View pointerEvents="none">
                <TextInput
                  value={expiryDateISO ? toDisplay(expiryDateISO) : (selectedPlan ? '—' : 'Select a plan first')}
                  mode="outlined"
                  editable={false}
                outlineColor={outlineColor(theme)}
                testID="company-address1-input"
                onFocus={() => handleFocus(address1InputRef)}
              />
            </View>
          </Field>

          <Field label="Address Line 2">
            <View ref={address2InputRef} collapsable={false}>
              <TextInput
                value={address2}
                onChangeText={setAddress2}
                mode="outlined"
                placeholder="Sector, Area, Building..."
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={outlineColor(theme)}
                testID="company-address2-input"
                onFocus={() => handleFocus(address2InputRef)}
              />
            </View>
          </Field>
        </Surface>

        {/* ── Password Settings ──────────────────────────────────────── */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Password Settings</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, opacity: 0.8 }}>
            Set a password for the default ADMIN user of this company. (Must be at least 8 characters, containing uppercase, lowercase, number, and special character).
          </Text>

          <Field label="New Password" required error={!!fieldErrors.password} hint={fieldErrors.password}>
            <TextInput
              value={password}
              onChangeText={(v) => { setPassword(v); clearErr('password'); }}
              secureTextEntry={!showPassword}
              mode="outlined"
              placeholder="Enter new password"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              outlineColor={fieldErrors.password ? theme.colors.error : outlineColor(theme)}
              right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
              testID="new-password-input"
            />
          </Field>

          <Field label="Confirm Password" required error={!!fieldErrors.confirm_password} hint={fieldErrors.confirm_password}>
            <TextInput
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clearErr('confirm_password'); }}
              secureTextEntry={!showConfirmPassword}
              mode="outlined"
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
              outlineColor={fieldErrors.confirm_password ? theme.colors.error : outlineColor(theme)}
              right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off' : 'eye'} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />}
              testID="confirm-password-input"
            />
          </Field>
        </Surface>

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={saving}
          buttonColor={theme.colors.secondary}
          textColor={theme.colors.onSecondary}
          style={styles.saveBtn}
          testID="save-company-button"
        >
          Register Company
        </Button>
      </View>
    </ScrollView>

      {/* ── Custom Date Picker Modal ─────────────────────────────────────── */}
      <DatePickerModal
        visible={showDatePicker}
        currentISO={validityDateISO}
        onConfirm={(iso) => { setValidityDateISO(iso); setShowDatePicker(false); }}
        onDismiss={() => setShowDatePicker(false)}
      />

      {/* ── Selection Modal with Search ──────────────────────────────────── */}
      <SelectionModal
        visible={modalVisible}
        title={modalTitle}
        options={modalOptions}
        loading={modalLoading}
        onSelect={onSelectCallback}
        onDismiss={() => setModalVisible(false)}
      />

      {/* ── Save Overlay ──────────────────────────────────────────────────── */}
      {saving && (
        <Portal>
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                zIndex: 9999,
                backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)',
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <AppLoader message="Registering new company..." icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
    </View>
  );

  function clearErr(key: string) {
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function outlineColor(theme: MD3Theme) {
  return theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B';
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  hint?: string;
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
      {hint && (
        <Text
          variant="bodySmall"
          style={{
            color: error ? theme.colors.error : theme.colors.onSurfaceVariant,
            fontWeight: error ? 'bold' : 'normal',
            marginTop: 2,
          }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}

function SelectorTrigger({
  value,
  placeholder,
  hasError,
  disabled,
  onPress,
  theme,
  testID,
}: {
  value?: string;
  placeholder: string;
  hasError?: boolean;
  disabled?: boolean;
  onPress: () => void;
  theme: MD3Theme;
  testID?: string;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} testID={testID} style={{ width: '100%' }}>
      <View pointerEvents="none" style={{ width: '100%' }}>
        <TextInput
          value={value ?? ''}
          mode="outlined"
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
          right={<TextInput.Icon icon={disabled ? 'lock-outline' : 'chevron-down'} />}
          outlineColor={hasError ? theme.colors.error : (theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B')}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1 },
    scrollContent: { padding: 16, gap: 16, paddingBottom: 60 },
    card: {
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: 16,
      gap: 14,
    },
    sectionTitle: { fontWeight: '800', color: theme.colors.onSurface, letterSpacing: -0.2 },
    saveBtn: { borderRadius: 8, alignSelf: 'center', minWidth: 140, marginTop: 8 },
  });
