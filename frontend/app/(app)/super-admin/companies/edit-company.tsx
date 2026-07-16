// frontend/app/(app)/super-admin/companies/edit.tsx
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
  Switch,
  useTheme,
  MD3Theme,
  Portal,
  Surface,
  Divider,
  FAB,
  TouchableRipple,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';
import { formatDateTime } from '@utils/dateFormatter';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  const parts = iso.split('T')[0].split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
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
  const [month, setMonth] = useState(parsed.getMonth());
  const [day, setDay] = useState(parsed.getDate());

  useEffect(() => {
    const maxDay = daysInMonth(year, month);
    if (day > maxDay) setDay(maxDay);
  }, [year, month]);

  const maxDay = daysInMonth(year, month);

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 340 },
    title: { fontWeight: '800', color: theme.colors.onSurface, textAlign: 'center', marginBottom: 16, fontSize: 16 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    fieldLabel: { color: theme.colors.onSurfaceVariant, fontWeight: '700', fontSize: 12, width: 60 },
    arrowBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: theme.colors.surfaceVariant },
    valueText: { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 15, color: theme.colors.onSurface },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={s.overlay} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Surface style={s.card} elevation={4}>
            <Text style={s.title}>Select Date</Text>
            {/* Day */}
            <View style={s.row}>
              <Text style={s.fieldLabel}>Day</Text>
              <TouchableOpacity style={s.arrowBtn} onPress={() => setDay((d) => Math.max(1, d - 1))}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={s.valueText}>{String(day).padStart(2, '0')}</Text>
              <TouchableOpacity style={s.arrowBtn} onPress={() => setDay((d) => Math.min(maxDay, d + 1))}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </View>
            {/* Month */}
            <View style={s.row}>
              <Text style={s.fieldLabel}>Month</Text>
              <TouchableOpacity style={s.arrowBtn} onPress={() => setMonth((m) => (m - 1 + 12) % 12)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={s.valueText}>{MONTHS[month]}</Text>
              <TouchableOpacity style={s.arrowBtn} onPress={() => setMonth((m) => (m + 1) % 12)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            </View>
            {/* Year */}
            <View style={s.row}>
              <Text style={s.fieldLabel}>Year</Text>
              <TouchableOpacity style={s.arrowBtn} onPress={() => setYear((y) => y - 1)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={s.valueText}>{year}</Text>
              <TouchableOpacity style={s.arrowBtn} onPress={() => setYear((y) => y + 1)}>
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
            <View style={s.actions}>
              <Button mode="text" onPress={onDismiss} textColor={theme.colors.onSurfaceVariant}>Cancel</Button>
              <Button
                mode="contained"
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onSecondary}
                onPress={() => { onConfirm(toISO(new Date(year, month, day, 12, 0, 0))); }}
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

// ─── Selection Modal with Search ──────────────────────────────────────────────

function SelectionModal({
  visible, title, options, loading, onSelect, onDismiss,
}: {
  visible: boolean; title: string; options: Option[];
  loading: boolean; onSelect: (opt: Option) => void; onDismiss: () => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  useEffect(() => { if (visible) setSearch(''); }, [visible]);

  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 360, backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF', borderRadius: 20, padding: 16 },
    modalTitle: { fontWeight: '800', color: theme.colors.onSurface, textAlign: 'center', marginBottom: 8 },
    searchWrapper: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
      borderRadius: 10, paddingHorizontal: 10, height: 42, marginBottom: 10,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    },
    searchIcon: { fontSize: 16, color: theme.colors.onSurfaceVariant, marginRight: 6 },
    searchField: { flex: 1, fontSize: 14, color: theme.colors.onSurface, paddingVertical: 0, paddingHorizontal: 0 },
    clearBtn: { padding: 4 },
    optionItem: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={s.overlay} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Surface style={s.card} elevation={4}>
            <Text variant="titleMedium" style={s.modalTitle}>{title}</Text>
            {/* Compact Search bar */}
            <View style={s.searchWrapper}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                mode="flat"
                placeholder={`Search ${title.replace('Select ', '')}...`}
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                style={[s.searchField, { backgroundColor: 'transparent' }]}
                testID="selector-search-input"
              />
              {!!search && (
                <Pressable onPress={() => setSearch('')} style={s.clearBtn}>
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
                    style={s.optionItem}
                    rippleColor={theme.colors.secondaryContainer}
                    testID={`select-option-${item.id}`}
                  >
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{item.name}</Text>
                  </TouchableRipple>
                )}
                ListEmptyComponent={
                  <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 20 }}>
                    {search ? `No results for "${search}"` : 'No items available.'}
                  </Text>
                }
              />
            )}
            <Button mode="text" onPress={onDismiss} style={{ alignSelf: 'flex-end', marginTop: 8 }} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
          </Surface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Edit Form ───────────────────────────────────────────────────────────

export default function EditCompanyPage() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
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
    }, 150);
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
  const [isActive, setIsActive] = useState(true);
  const [maxUsers, setMaxUsers] = useState('5');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

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

  // In-memory cache — shared per page mount
  const cache = useRef<Partial<Record<CacheKey, Option[]>>>({});

  // Selection modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalOptions, setModalOptions] = useState<Option[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [onSelectCallback, setOnSelectCallback] = useState<(opt: Option) => void>(() => {});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Recalculate expiry ────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedPlan?.duration_days && selectedPlan.duration_days > 0) {
      setExpiryDateISO(calcExpiryISO(validityDateISO, selectedPlan.duration_days));
    } else {
      // Keep existing expiry if no plan duration info
    }
  }, [validityDateISO, selectedPlan]);

  // ── Load existing company data on mount ───────────────────────────────────
  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId) { setLoading(false); return; }
      try {
        const token = await AsyncStorage.getItem('authToken');
        const res = await fetchJson(`${API_BASE_URL}/super-admin/companies?limit=5000`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && res.data) {
          const matched = (res.data.data || []).find((c: any) => String(c.id) === String(companyId));
          if (matched) {
            setOwnerName(matched.owner_name || '');
            setName(matched.name || '');
            setEmail(matched.email || '');
            setMobile1(matched.mobile1 || '');
            setMobile2(matched.mobile2 || '');
            setGstNo(matched.gst_no || '');
            setAddress1(matched.address1 || '');
            setAddress2(matched.address2 || '');
            setPrintName(matched.print_name || '');
            setIsActive(matched.is_active ?? true);
            setMaxUsers(String(matched.max_users ?? 5));
            setCreatedAt(matched.created_at || null);
            setUpdatedAt(matched.updated_at || null);

            // Parse dates
            if (matched.validity_date) setValidityDateISO(matched.validity_date.split('T')[0]);
            if (matched.expiry_date) setExpiryDateISO(matched.expiry_date.split('T')[0]);

            // Pre-populate selections (display only — lazy loads on tap for selects)
            if (matched.country_id) setSelectedCountry({ id: matched.country_id, name: matched.country_name });
            if (matched.state_id) setSelectedState({ id: matched.state_id, name: matched.state_name });
            if (matched.city_id) setSelectedCity({ id: matched.city_id, name: matched.city_name });
            if (matched.category_id) setSelectedCategory({ id: matched.category_id, name: matched.category_name });
            if (matched.plan_id) setSelectedPlan({ id: matched.plan_id, name: matched.plan_name ?? 'Selected Plan', duration_days: matched.duration_days ?? 0 });
          }
        }
      } catch {
        showError('Failed to load company data');
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, [companyId]);

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
        const res = await fetchJson(endpoint, { headers: { Authorization: `Bearer ${token}` } });
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
      'categories', 'Select Category',
      `${API_BASE_URL}/super-admin/company-categories?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name })),
      (opt) => setSelectedCategory(opt),
    );

  const openCountries = () =>
    fetchAndOpen(
      'countries', 'Select Country',
      `${API_BASE_URL}/super-admin/countries?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name })),
      (opt) => { setSelectedCountry(opt); setSelectedState(null); setSelectedCity(null); },
    );

  const openStates = () => {
    if (!selectedCountry) return;
    fetchAndOpen(
      'states', 'Select State',
      `${API_BASE_URL}/super-admin/states?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name, country_id: r.country_id })),
      (opt) => { setSelectedState(opt); setSelectedCity(null); },
      (o) => String(o.country_id) === String(selectedCountry.id),
    );
  };

  const openCities = () => {
    if (!selectedState) return;
    fetchAndOpen(
      'cities', 'Select City',
      `${API_BASE_URL}/super-admin/cities?limit=1000`,
      (raw) => raw.map((r) => ({ id: r.id, name: r.name, state_id: r.state_id })),
      (opt) => setSelectedCity(opt),
      (o) => String(o.state_id) === String(selectedState.id),
    );
  };

  const openPlans = () =>
    fetchAndOpen(
      'plans', 'Select Plan',
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
    if (!selectedPlan) errors.plan = 'Subscription plan selection is required.';
    if (!maxUsers.trim() || parseInt(maxUsers, 10) <= 0) {
      errors.max_users = 'Max allowed users must be a positive integer.';
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
      const response = await fetchJson(`${API_BASE_URL}/super-admin/companies/${companyId}`, {
        method: 'PUT',
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
          is_active: isActive,
          max_users: parseInt(maxUsers, 10) || 5,
        }),
      });

      if (response.ok) {
        showSuccess('Company updated successfully');
        router.back();
      } else {
        showError(response.data?.message || 'Failed to update company.');
      }
    } catch {
      showError('Network error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AppLoader message="Loading company data..." icon="database-sync-outline" />;
  }

  const clearErr = (key: string) => {
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Update Company Details"
        showBack
        onBackPress={() => router.back()}
        actions={
          (createdAt || updatedAt) ? (
            <View style={{ marginRight: 16, alignItems: 'flex-end', justifyContent: 'center' }}>
              {createdAt && (
                <Text style={{ fontSize: 10, color: theme.colors.onPrimary, opacity: 0.8 }}>
                  Created: {formatDateTime(createdAt)}
                </Text>
              )}
              {updatedAt && (
                <Text style={{ fontSize: 10, color: theme.colors.onPrimary, opacity: 0.8, marginTop: 2 }}>
                  Updated: {formatDateTime(updatedAt)}
                </Text>
              )}
            </View>
          ) : undefined
        }
      />

      <FAB
        icon="shield-key-outline"
        label="Permissions"
        onPress={() => router.push(`/super-admin/companies/menu-permissions?companyId=${companyId}`)}
        color={theme.colors.secondary}
        style={[
          styles.menuPermissionsFab,
          {
            backgroundColor: 'transparent',
            elevation: 0,
            shadowColor: 'transparent',
            shadowOpacity: 0,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
        testID="edit-menu-permissions-button"
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 60 }]}
        automaticallyAdjustKeyboardInsets={true}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          {/* ── Organisation Details ───────────────────────────────────── */}
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Organization Details</Text>

            <FieldRow label="Company Name" required error={!!fieldErrors.name} theme={theme}>
              <TextInput
                value={name} onChangeText={(v) => { setName(v); clearErr('name'); }}
                mode="outlined" placeholder="e.g. Acme Corp"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.name ? theme.colors.error : oc(theme)}
                testID="company-name-input"
              />
            </FieldRow>

            <FieldRow label="Owner Full Name" required error={!!fieldErrors.owner_name} theme={theme}>
              <TextInput
                value={ownerName} onChangeText={(v) => { setOwnerName(v); clearErr('owner_name'); }}
                mode="outlined" placeholder="e.g. John Doe"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.owner_name ? theme.colors.error : oc(theme)}
                testID="owner-name-input"
              />
            </FieldRow>

            <FieldRow label="Email Address" required error={!!fieldErrors.email} theme={theme}>
              <TextInput
                value={email} onChangeText={(v) => { setEmail(v); clearErr('email'); }}
                mode="outlined" keyboardType="email-address" autoCapitalize="none"
                placeholder="e.g. support@acme.com"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.email ? theme.colors.error : oc(theme)}
                testID="company-email-input"
              />
            </FieldRow>

            <FieldRow label="Primary Mobile" required error={!!fieldErrors.mobile1} theme={theme}>
              <TextInput
                value={mobile1} onChangeText={(v) => { setMobile1(v); clearErr('mobile1'); }}
                mode="outlined" keyboardType="phone-pad" placeholder="e.g. 9876543210"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.mobile1 ? theme.colors.error : oc(theme)}
                testID="company-mobile1-input"
              />
            </FieldRow>

            <FieldRow label="Secondary Mobile" theme={theme}>
              <TextInput
                value={mobile2} onChangeText={setMobile2}
                mode="outlined" keyboardType="phone-pad" placeholder="e.g. 9876543211"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={oc(theme)}
              />
            </FieldRow>
          </Surface>

          {/* ── Location & Classification ──────────────────────────────── */}
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Location & Classification</Text>

            <FieldRow label="Company Category" required error={!!fieldErrors.category} theme={theme}>
              <SelTrigger value={selectedCategory?.name} placeholder="Tap to select Category..." hasError={!!fieldErrors.category} onPress={openCategories} theme={theme} testID="select-category-trigger" />
            </FieldRow>

            <FieldRow label="Country" required error={!!fieldErrors.country} theme={theme}>
              <SelTrigger value={selectedCountry?.name} placeholder="Tap to select Country..." hasError={!!fieldErrors.country} onPress={openCountries} theme={theme} testID="select-country-trigger" />
            </FieldRow>

            <FieldRow label="State" required error={!!fieldErrors.state} theme={theme}>
              <SelTrigger
                value={selectedState?.name}
                placeholder={selectedCountry ? 'Tap to select State...' : 'Select Country first...'}
                hasError={!!fieldErrors.state} disabled={!selectedCountry}
                onPress={openStates} theme={theme} testID="select-state-trigger"
              />
            </FieldRow>

            <FieldRow label="City" required error={!!fieldErrors.city} theme={theme}>
              <SelTrigger
                value={selectedCity?.name}
                placeholder={selectedState ? 'Tap to select City...' : 'Select State first...'}
                hasError={!!fieldErrors.city} disabled={!selectedState}
                onPress={openCities} theme={theme} testID="select-city-trigger"
              />
            </FieldRow>
          </Surface>

          {/* ── Subscription & Validity ────────────────────────────────── */}
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Subscription & Validity</Text>

            <FieldRow label="Subscription Plan" required error={!!fieldErrors.plan} theme={theme}>
              <SelTrigger value={selectedPlan?.name} placeholder="Tap to select Subscription Plan..." hasError={!!fieldErrors.plan} onPress={openPlans} theme={theme} testID="select-plan-trigger" />
            </FieldRow>

            {/* Validity / Start Date */}
            <FieldRow label="Subscription Start Date" required theme={theme}>
              <Pressable onPress={() => setShowDatePicker(true)} testID="validity-date-trigger">
                <View pointerEvents="none">
                  <TextInput
                    value={toDisplay(validityDateISO)}
                    mode="outlined" editable={false} placeholder="DD-MM-YYYY"
                    right={<TextInput.Icon icon="calendar" />}
                    outlineColor={oc(theme)} testID="validity-date-input"
                  />
                </View>
              </Pressable>
            </FieldRow>

            {/* Expiry Date — read-only */}
            <FieldRow
              label="Expiry Date"
              hint={selectedPlan?.duration_days ? `Auto-calculated · ${selectedPlan.duration_days} days from start` : 'Auto-calculated after plan selection'}
              theme={theme}
            >
              <View pointerEvents="none">
                <TextInput
                  value={expiryDateISO ? toDisplay(expiryDateISO) : (selectedPlan ? '—' : 'Select a plan first')}
                  mode="outlined" editable={false}
                  right={<TextInput.Icon icon="lock-outline" />}
                  outlineColor={theme.dark ? 'rgba(255,255,255,0.3)' : '#CBD5E1'}
                  style={{ backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                  testID="expiry-date-input"
                />
              </View>
            </FieldRow>

            {/* Max Allowed Users */}
            <FieldRow label="Max Allowed Users" required error={!!fieldErrors.max_users} theme={theme}>
              <TextInput
                value={maxUsers}
                onChangeText={(v) => { setMaxUsers(v.replace(/[^0-9]/g, '')); clearErr('max_users'); }}
                mode="outlined"
                keyboardType="numeric"
                placeholder="e.g. 5"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={fieldErrors.max_users ? theme.colors.error : oc(theme)}
                testID="company-max-users-input"
              />
            </FieldRow>

            {/* Status Toggle */}
            <View style={{ gap: 4, marginTop: 4 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
                Status Active
              </Text>
              <View style={{ alignItems: 'flex-start' }}>
                <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} testID="company-active-switch" />
              </View>
            </View>
          </Surface>

          {/* ── Additional Information ─────────────────────────────────── */}
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Additional Information</Text>

            <FieldRow label="GST Number" theme={theme}>
              <View ref={gstInputRef} collapsable={false}>
                <TextInput value={gstNo} onChangeText={setGstNo} mode="outlined" placeholder="e.g. 22AAAAA0000A1Z5"
                  placeholderTextColor={theme.colors.onSurfaceVariant + '80'} outlineColor={oc(theme)} testID="company-gst-input" onFocus={() => handleFocus(gstInputRef)} />
              </View>
            </FieldRow>

            <FieldRow label="Print Label Name" theme={theme}>
              <View ref={printNameInputRef} collapsable={false}>
                <TextInput value={printName} onChangeText={setPrintName} mode="outlined" placeholder="e.g. Acme Printing"
                  placeholderTextColor={theme.colors.onSurfaceVariant + '80'} outlineColor={oc(theme)} testID="company-printname-input" onFocus={() => handleFocus(printNameInputRef)} />
              </View>
            </FieldRow>

            <FieldRow label="Address Line 1" theme={theme}>
              <View ref={address1InputRef} collapsable={false}>
                <TextInput value={address1} onChangeText={setAddress1} mode="outlined" placeholder="Street name, landmark..."
                  placeholderTextColor={theme.colors.onSurfaceVariant + '80'} outlineColor={oc(theme)} testID="company-address1-input" onFocus={() => handleFocus(address1InputRef)} />
              </View>
            </FieldRow>

            <FieldRow label="Address Line 2" theme={theme}>
              <View ref={address2InputRef} collapsable={false}>
                <TextInput value={address2} onChangeText={setAddress2} mode="outlined" placeholder="Sector, Area, Building..."
                  placeholderTextColor={theme.colors.onSurfaceVariant + '80'} outlineColor={oc(theme)} testID="company-address2-input" onFocus={() => handleFocus(address2InputRef)} />
              </View>
            </FieldRow>
          </Surface>

          <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={saving}
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
              style={{ borderRadius: 8, minWidth: 140 }}
              testID="save-company-button"
            >
              Update Company
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Users floating action button, placed right below/above the menu permissions FAB */}
      <FAB
        icon="account-multiple-outline"
        label="Users"
        onPress={() => router.push(`/super-admin/companies/company-users?companyId=${companyId}`)}
        color={theme.colors.secondary}
        style={[
          styles.usersFab,
          {
            backgroundColor: 'transparent',
            elevation: 0,
            shadowColor: 'transparent',
            shadowOpacity: 0,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
        testID="company-users-fab"
      />

      {/* ── Custom Date Picker Modal ────────────────────────────────────── */}
      <DatePickerModal
        visible={showDatePicker}
        currentISO={validityDateISO}
        onConfirm={(iso) => { setValidityDateISO(iso); setShowDatePicker(false); }}
        onDismiss={() => setShowDatePicker(false)}
      />

      {/* ── Selection Modal with Search ──────────────────────────────────── */}
      <SelectionModal
        visible={modalVisible} title={modalTitle}
        options={modalOptions} loading={modalLoading}
        onSelect={onSelectCallback}
        onDismiss={() => setModalVisible(false)}
      />

      {/* ── Save Overlay ──────────────────────────────────────────────────── */}
      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Updating company details..." icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
    </View>
  );
}

// ─── Tiny helper components ───────────────────────────────────────────────────

function oc(theme: MD3Theme) {
  return theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B';
}

function FieldRow({
  label, required, error, hint, theme, children,
}: {
  label: string; required?: boolean; error?: boolean; hint?: string; theme: MD3Theme; children: React.ReactNode;
}) {
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

function SelTrigger({
  value, placeholder, hasError, disabled, onPress, theme, testID,
}: {
  value?: string; placeholder: string; hasError?: boolean;
  disabled?: boolean; onPress: () => void; theme: MD3Theme; testID?: string;
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
          outlineColor={hasError ? theme.colors.error : oc(theme)}
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
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF', borderRadius: 12,
      borderWidth: 1, borderColor: theme.colors.outlineVariant, padding: 16, gap: 14,
    },
    sectionTitle: { fontWeight: '800', color: theme.colors.onSurface, letterSpacing: -0.2 },
    saveBtn: { borderRadius: 8, alignSelf: 'center', minWidth: 140, marginTop: 8 },
    menuPermissionsFab: {
      position: 'absolute',
      top: 110,
      right: 16,
      borderRadius: 12,
      zIndex: 99,
    },
    usersFab: {
      position: 'absolute',
      top: 170,
      right: 16,
      borderRadius: 12,
      zIndex: 99,
    },
  });
