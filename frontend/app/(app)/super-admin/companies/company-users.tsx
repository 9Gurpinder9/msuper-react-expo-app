import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, Keyboard, useWindowDimensions } from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  FAB,
  Searchbar,
  useTheme,
  Avatar,
  Appbar,
  MD3Theme,
  IconButton,
  Menu,
  Portal,
  Modal,
  TextInput,
  Switch,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';
import { formatDateTime } from '@utils/dateFormatter';

type RoleOption = {
  id: number;
  name: string;
};

type CompanyUser = {
  id: number;
  company_id: number;
  role_id: number;
  role_name?: string;
  email: string;
  name: string;
  mobile?: string | null;
  country_id?: number | string | null;
  country_name?: string | null;
  state_id?: number | string | null;
  state_name?: string | null;
  city_id?: number | string | null;
  city_name?: string | null;
  address?: string | null;
  is_active: boolean;
  email_verified: boolean;
  verification_sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function CompanyUsersRegistry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Layout modes & list refs
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list');
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchRef = useRef<React.ComponentRef<typeof Searchbar>>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<FlatList>(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState<number | null>(null);

  // Verification Dialog States
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyUserId, setVerifyUserId] = useState<number | null>(null);
  const [verifyUserEmail, setVerifyUserEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Add/Edit Dialog States
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoleId, setFormRoleId] = useState<number | null>(null);
  const [formPassword, setFormPassword] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formMobile, setFormMobile] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formState, setFormState] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmailVerified, setFormEmailVerified] = useState(false);
  const [formVerifiedAt, setFormVerifiedAt] = useState('');
  const [formCreatedAt, setFormCreatedAt] = useState('');
  const [formUpdatedAt, setFormUpdatedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Fetch roles (cached/once)
  const fetchRoles = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetchJson(`${API_BASE_URL}/super-admin/roles?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && response.data) {
        setRoles(response.data.data || []);
      }
    } catch {
      // Quiet fail or log
    }
  };

  const fetchUsers = async (query = '', pageNum = 1, isLoadMore = false) => {
    if (!companyId) return;
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const params = new URLSearchParams();
      params.append('companyId', String(companyId));
      if (query) params.append('search', query);
      params.append('page', String(pageNum));
      params.append('limit', '20');

      const url = `${API_BASE_URL}/super-admin/users?${params.toString()}`;
      const response = await fetchJson(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok && response.data) {
        const newItems = response.data.data || [];
        if (isLoadMore) {
          setUsers((prev) => [...prev, ...newItems]);
        } else {
          setUsers(newItems);
        }
        setTotalRecords(response.data.pagination?.total || 0);
        setHasMore(response.data.pagination?.has_more ?? false);
        setPage(pageNum);
      } else {
        showError(response.data?.message || 'Failed to load company users');
      }
    } catch {
      showError('Network error loading company users');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchUsers(search, page + 1, true);
  };

  const fetchCompanyDetails = async () => {
    if (!companyId) return;
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetchJson(`${API_BASE_URL}/super-admin/companies?limit=5000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && response.data) {
        const matched = (response.data.data || []).find((c: any) => String(c.id) === String(companyId));
        if (matched) {
          setCompanyName(matched.name);
        }
      }
    } catch {
      // Quiet fail
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchRoles();
      fetchCompanyDetails();
      fetchUsers(search, 1, false);
    }, [search, companyId])
  );

  useEffect(() => {
    if (searchExpanded) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      Keyboard.dismiss();
    }
  }, [searchExpanded]);

  // Dialog Operations
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRoleId(roles.find(r => r.name.toUpperCase() === 'ADMIN')?.id || null);
    setFormPassword('');
    setFormIsActive(true);
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleOpenEdit = (user: CompanyUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRoleId(user.role_id);
    setFormPassword('');
    setFormIsActive(user.is_active);
    setFormMobile(user.mobile || '');
    setFormCountry(user.country_name || '');
    setFormState(user.state_name || '');
    setFormCity(user.city_name || '');
    setFormAddress(user.address || '');
    setFormEmailVerified(user.email_verified);
    setFormVerifiedAt(user.verification_sent_at || '');
    setFormCreatedAt(user.created_at || '');
    setFormUpdatedAt(user.updated_at || '');
    setFieldErrors({});
    setDialogVisible(true);
  };

  const handleSaveUser = async () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Name is required.';
    if (!formEmail.trim() || !/^\S+@\S+\.\S+$/.test(formEmail)) errors.email = 'Valid email is required.';
    if (!formRoleId) errors.role = 'Role selection is required.';

    if (!editingUser && !formPassword.trim()) {
      errors.password = 'Password is required for new users.';
    } else if (formPassword.trim()) {
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordPattern.test(formPassword)) {
        errors.password = 'Must be at least 8 characters and contain uppercase, lowercase, number, and special character.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const isEdit = !!editingUser;
      const url = isEdit
        ? `${API_BASE_URL}/super-admin/users/${editingUser.id}`
        : `${API_BASE_URL}/super-admin/users`;

      const body = {
        company_id: Number(companyId),
        role_id: formRoleId,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        is_active: formIsActive,
        ...(formPassword.trim() ? { password: formPassword.trim() } : {}),
      };

      const response = await fetchJson(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        showSuccess(isEdit ? 'User updated successfully' : 'User registered successfully');
        setDialogVisible(false);
        fetchUsers(search, 1, false);
      } else {
        showError(response.data?.message || 'Failed to save user.');
      }
    } catch {
      showError('Network error saving user details.');
    } finally {
      setSaving(false);
    }
  };

  // OTP Verification Operations
  const handleSendVerification = async (userId: number, emailAddress: string) => {
    setSendingOtp(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetchJson(`${API_BASE_URL}/super-admin/users/${userId}/send-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        showSuccess('Verification OTP sent successfully!');
        setVerifyUserId(userId);
        setVerifyUserEmail(emailAddress);
        setOtp('');
        setVerifyModalVisible(true);
      } else {
        showError(response.data?.message || 'Failed to send verification email.');
      }
    } catch {
      showError('Network error occurred.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      showError('OTP must be exactly 6 digits.');
      return;
    }
    setVerifying(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetchJson(`${API_BASE_URL}/super-admin/users/${verifyUserId}/verify-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      if (response.ok) {
        showSuccess('Email verified successfully!');
        setVerifyModalVisible(false);
        fetchUsers(search, 1, false);
      } else {
        showError(response.data?.message || 'Invalid OTP.');
      }
    } catch {
      showError('Network error occurred.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="Company Users"
        showBack
        onBackPress={() => router.back()}
        actions={
          <>
            <Appbar.Action
              icon="magnify"
              color={theme.colors.primary}
              onPress={() => setSearchExpanded(!searchExpanded)}
              testID="search-toggle-button"
            />
            <Menu
              visible={layoutMenuOpen}
              onDismiss={() => setLayoutMenuOpen(false)}
              anchor={
                <Appbar.Action
                  icon={viewMode === 'table' ? 'table-large' : 'format-list-bulleted'}
                  color={theme.colors.primary}
                  onPress={() => setLayoutMenuOpen(true)}
                />
              }
            >
              <Menu.Item
                leadingIcon="format-list-bulleted"
                title="List"
                onPress={() => {
                  setViewMode('list');
                  setLayoutMenuOpen(false);
                }}
              />
              <Menu.Item
                leadingIcon="table-large"
                title="Table"
                onPress={() => {
                  setViewMode('table');
                  setLayoutMenuOpen(false);
                }}
              />
            </Menu>
          </>
        }
      />

      {(searchExpanded || search.trim() !== '') && (
        <View style={styles.headerBar}>
          <Searchbar
            ref={searchRef}
            placeholder="Search users by name or email..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchbar}
            inputStyle={{ minHeight: 0 }}
            iconColor={theme.colors.onSurfaceVariant}
            testID="users-searchbar"
          />
        </View>
      )}

      <View style={[styles.subHeader, { backgroundColor: theme.colors.surfaceVariant, paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.primary }}>
          🏢 Company: {companyName || 'Loading...'} <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: 'normal' }}>(ID: {companyId})</Text>
        </Text>
        <Text variant="bodySmall" style={styles.totalText}>
          Total records: {totalRecords}
        </Text>
      </View>

      {loading ? (
        <AppLoader message="Loading company users..." icon="database-sync-outline" />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              <FlatList
                ref={listRef}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                data={users}
                keyExtractor={(item) => String(item.id)}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  loadingMore ? (
                    <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-multiple-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                    <Text variant="bodyLarge" style={styles.emptyText}>
                      No users registered yet.
                    </Text>
                  </View>
                }
                renderItem={renderTableItem}
              />
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.listCard}>
          <FlatList
            ref={listRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            data={users}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="account-multiple-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No users registered yet.
                </Text>
              </View>
            }
            renderItem={renderListItem}
          />
        </View>
      )}

      {showScrollTop && (
        <View style={styles.scrollTopContainer}>
          <FAB
            icon="chevron-up"
            style={styles.scrollTopFab}
            customSize={40}
            color={theme.colors.onSurface}
            onPress={scrollToTop}
          />
        </View>
      )}

      {/* Add FAB removed - read-only view */}

      {/* View User Details Dialog */}
      <Portal>
        <Modal
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          contentContainerStyle={[
            styles.dialogContainer,
            isLargeScreen && { width: 600, left: '50%', marginLeft: -300, right: 'auto', top: 40 },
          ]}
          testID="user-dialog"
        >
          <Text variant="titleLarge" style={styles.dialogTitle}>
            User Details
          </Text>

          <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ gap: 14 }}>
            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Full Name
              </Text>
              <TextInput
                value={formName}
                editable={false}
                mode="outlined"
                placeholder="No name provided"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
                testID="user-name-input"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Mobile
              </Text>
              <TextInput
                value={formMobile}
                editable={false}
                mode="outlined"
                placeholder="No mobile number provided"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Email Address
              </Text>
              <TextInput
                value={formEmail}
                editable={false}
                mode="outlined"
                placeholder="No email provided"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                keyboardType="email-address"
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
                testID="user-email-input"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Role
              </Text>
              <TextInput
                value={roles.find(r => r.id === formRoleId)?.name || editingUser?.role_name || '-'}
                editable={false}
                mode="outlined"
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Country
              </Text>
              <TextInput
                value={formCountry}
                editable={false}
                mode="outlined"
                placeholder="No country provided"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                State
              </Text>
              <TextInput
                value={formState}
                editable={false}
                mode="outlined"
                placeholder="No state provided"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                City
              </Text>
              <TextInput
                value={formCity}
                editable={false}
                mode="outlined"
                placeholder="No city provided"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Address
              </Text>
              <TextInput
                value={formAddress}
                editable={false}
                mode="outlined"
                placeholder="No address provided"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Email Verify Status
              </Text>
              <TextInput
                value={formEmailVerified ? 'VERIFIED' : 'UNVERIFIED'}
                editable={false}
                mode="outlined"
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Verify On
              </Text>
              <TextInput
                value={formEmailVerified && formVerifiedAt ? formatDateTime(formVerifiedAt) : '-'}
                editable={false}
                mode="outlined"
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Is Active
              </Text>
              <TextInput
                value={formIsActive ? 'ACTIVE' : 'DISABLED'}
                editable={false}
                mode="outlined"
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Created At
              </Text>
              <TextInput
                value={formatDateTime(formCreatedAt)}
                editable={false}
                mode="outlined"
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Updated At
              </Text>
              <TextInput
                value={formatDateTime(formUpdatedAt)}
                editable={false}
                mode="outlined"
                outlineColor={outlineColor(theme)}
                activeOutlineColor={theme.colors.primary}
              />
            </View>
          </ScrollView>

          <View style={styles.dialogActions}>
            <Button
              mode="contained"
              onPress={() => setDialogVisible(false)}
              style={{ minWidth: 140, borderRadius: 8 }}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
            >
              Close
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Verification Dialog */}
      <Portal>
        <Modal
          visible={verifyModalVisible}
          onDismiss={() => { if (!verifying) setVerifyModalVisible(false); }}
          contentContainerStyle={styles.verificationDialog}
          testID="verification-dialog"
        >
          <Text variant="titleLarge" style={{ fontWeight: '800', textAlign: 'center', marginBottom: 12, color: theme.colors.onSurface }}>
            Email Verification
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 20 }}>
            Enter the 6-digit OTP sent to the email address <Text style={{ fontWeight: 'bold' }}>{verifyUserEmail}</Text>
          </Text>

          <TextInput
            label="Verification OTP"
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            mode="outlined"
            placeholder="XXXXXX"
            outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
            placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
            style={{ marginBottom: 24 }}
            testID="verification-otp-input"
          />

          <View style={{ flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <Button
              mode="contained"
              onPress={handleVerifyOtp}
              disabled={verifying}
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
              style={{ minWidth: 140, borderRadius: 8 }}
              testID="confirm-verification-button"
            >
              Verify OTP
            </Button>
            <Button
              mode="text"
              onPress={() => handleSendVerification(verifyUserId!, verifyUserEmail)}
              disabled={verifying}
              textColor={theme.colors.primary}
              testID="resend-verification-button"
            >
              Resend OTP
            </Button>
            <Button
              mode="outlined"
              onPress={() => setVerifyModalVisible(false)}
              disabled={verifying}
              style={{ minWidth: 140, borderRadius: 8, borderColor: theme.colors.outline }}
              textColor={theme.colors.onSurfaceVariant}
            >
              Cancel
            </Button>
          </View>
        </Modal>
      </Portal>

      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Saving user..." icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
      {sendingOtp && (
        <Portal>
          <AppLoader message="Sending verification OTP..." icon="email-outline" transparent />
        </Portal>
      )}
      {verifying && (
        <Portal>
          <AppLoader message="Verifying OTP..." icon="shield-check-outline" transparent />
        </Portal>
      )}
    </View>
  );

  function renderTableHeader() {
    return (
      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, styles.cellId]}>
          <Text style={styles.headerText}>ID</Text>
        </View>
        <View style={[styles.headerCell, styles.cellName]}>
          <Text style={styles.headerText}>Full Name</Text>
        </View>
        <View style={[styles.headerCell, styles.cellEmail]}>
          <Text style={styles.headerText}>Email</Text>
        </View>
        <View style={[styles.headerCell, styles.cellRole]}>
          <Text style={styles.headerText}>Role</Text>
        </View>
        <View style={[styles.headerCell, styles.cellStatus]}>
          <Text style={styles.headerText}>Status</Text>
        </View>
        <View style={[styles.headerCell, styles.cellVerified]}>
          <Text style={styles.headerText}>Email Verified</Text>
        </View>
        <View style={[styles.headerCell, styles.cellAction, { borderRightWidth: 0, alignItems: 'center' }]}>
          <Text style={styles.headerText}>Action</Text>
        </View>
      </View>
    );
  }

  function renderTableItem({ item, index }: { item: CompanyUser; index: number }) {
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellId]}>
          <Text style={styles.cellText}>{index + 1}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellName]}>
          <Text style={styles.userNameText} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellEmail]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellRole]}>
          <Text style={styles.cellText}>{item.role_name || '-'}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellStatus]}>
          <Text style={[styles.statusText, { color: item.is_active ? theme.colors.primary : theme.colors.error }]}>
            {item.is_active ? 'ACTIVE' : 'DISABLED'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.cellVerified]}>
          <Text style={[styles.statusText, { color: item.email_verified ? theme.colors.primary : theme.colors.error }]}>
            {item.email_verified ? 'VERIFIED' : 'UNVERIFIED'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.cellAction, { borderRightWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }]}>
          <Button
            mode={theme.dark ? 'contained-tonal' : 'outlined'}
            buttonColor={theme.dark ? theme.colors.primaryContainer : undefined}
            textColor={theme.dark ? theme.colors.onPrimaryContainer : theme.colors.primary}
            compact
            onPress={() => handleOpenEdit(item)}
            style={styles.editBtn}
            labelStyle={styles.editBtnLabel}
            testID={`view-user-button-${index}`}
          >
            View
          </Button>

          {!item.email_verified && (
            <Button
              mode="outlined"
              compact
              onPress={() => handleSendVerification(item.id, item.email)}
              style={[styles.editBtn, { borderColor: theme.colors.secondary }]}
              labelStyle={[styles.editBtnLabel, { color: theme.colors.secondary }]}
              testID={`verify-user-button-${index}`}
            >
              Verify
            </Button>
          )}
        </View>
      </View>
    );
  }

  function renderListItem({ item, index }: { item: CompanyUser; index: number }) {
    const isLast = index === users.length - 1;
    return (
      <View style={[styles.listItem, isLast && styles.listItemLast]}>
        <Avatar.Icon
          size={36}
          icon="account"
          style={{ backgroundColor: theme.colors.secondaryContainer }}
          color={theme.colors.onSecondaryContainer}
        />
        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Email: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.email}</Text> | Role: <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{item.role_name || '-'}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 2, alignItems: 'center' }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Status: <Text style={{ fontWeight: '700', color: item.is_active ? theme.colors.primary : theme.colors.error }}>{item.is_active ? 'ACTIVE' : 'DISABLED'}</Text>
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Email Verify: <Text style={{ fontWeight: '700', color: item.email_verified ? theme.colors.primary : theme.colors.error }}>{item.email_verified ? 'VERIFIED' : 'UNVERIFIED'}</Text>
            </Text>
          </View>
        </View>
        <View style={[styles.listRightCol, { justifyContent: 'center', alignItems: 'center' }]}>
          <Menu
            visible={activeMenuUserId === item.id}
            onDismiss={() => setActiveMenuUserId(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setActiveMenuUserId(item.id)}
                iconColor={theme.colors.onSurfaceVariant}
                style={{ margin: 0 }}
                testID={`user-menu-button-${index}`}
              />
            }
          >
            <Menu.Item
              leadingIcon="eye-outline"
              title="View"
              onPress={() => {
                setActiveMenuUserId(null);
                handleOpenEdit(item);
              }}
              testID={`view-user-item-${index}`}
            />
            {!item.email_verified && (
              <Menu.Item
                leadingIcon="email-check-outline"
                title="Verify Email"
                onPress={() => {
                  setActiveMenuUserId(null);
                  handleSendVerification(item.id, item.email);
                }}
                testID={`verify-user-item-${index}`}
              />
            )}
          </Menu>
        </View>
      </View>
    );
  }
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerBar: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    searchbar: {
      elevation: 0,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      height: 44,
    },
    subHeader: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalText: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    listCard: {
      flex: 1,
      margin: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    listContent: {
      paddingBottom: 80,
    },
    // Table View
    tableContainer: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      flex: 1,
      minWidth: 840,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      alignItems: 'stretch',
    },
    headerCell: {
      paddingHorizontal: 6,
      paddingVertical: 12,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      justifyContent: 'center',
    },
    headerText: {
      fontWeight: '700',
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      alignItems: 'stretch',
    },
    tableCell: {
      paddingHorizontal: 6,
      paddingVertical: 10,
      borderRightWidth: 1,
      borderRightColor: theme.colors.outlineVariant,
      justifyContent: 'center',
      minHeight: 44,
    },
    cellText: {
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    cellId: {
      width: 50,
    },
    cellName: {
      width: 150,
      flexGrow: 1,
    },
    cellEmail: {
      width: 180,
      flexGrow: 1,
    },
    cellRole: {
      width: 100,
    },
    cellStatus: {
      width: 100,
    },
    cellVerified: {
      width: 120,
    },
    cellAction: {
      width: 140,
    },
    userNameText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    editBtn: {
      margin: 0,
      borderColor: theme.colors.primary,
      borderRadius: 8,
    },
    editBtnLabel: {
      fontSize: 11,
      marginVertical: 2,
      marginHorizontal: 8,
    },
    // List View
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    listItemLast: {
      borderBottomWidth: 0,
    },
    listRightCol: {
      alignItems: 'flex-end',
      justifyContent: 'center',
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
      color: theme.colors.onSurfaceVariant,
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 24,
      borderRadius: 12,
    },
    scrollTopContainer: {
      position: 'absolute',
      bottom: 24,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 99,
    },
    scrollTopFab: {
      backgroundColor: theme.dark ? 'rgba(30, 31, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)',
      borderRadius: 20,
      elevation: 3,
    },
    // Dialog / Modal Form
    dialogContainer: {
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      margin: 16,
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 20,
      padding: 24,
      elevation: 5,
    },
    dialogTitle: {
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 16,
      color: theme.colors.onSurface,
    },
    fieldRow: {
      gap: 6,
    },
    fieldLabel: {
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
    },
    rolePickerContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    dialogActions: {
      flexDirection: 'column',
      gap: 12,
      marginTop: 20,
      alignItems: 'center',
    },
    verificationDialog: {
      position: 'absolute',
      top: 40,
      left: '50%',
      transform: [{ translateX: -180 }],
      width: 360,
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 20,
      padding: 24,
      elevation: 5,
    },
  });

function outlineColor(theme: MD3Theme) {
  return theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B';
}
