import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Keyboard,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  Text,
  Button,
  FAB,
  Searchbar,
  useTheme,
  Avatar,
  Appbar,
  MD3Theme,
  Menu,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';

import TopAppBar from '@super-admin/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

type CompanyUser = {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  country_id: number | null;
  country_name: string | null;
  state_id: number | null;
  state_name: string | null;
  city_id: number | null;
  city_name: string | null;
  address: string | null;
  is_active: boolean;
  email_verified: boolean;
  verification_sent_at: string | null;
  role_id: number;
  role_name: string;
  has_password: boolean;
  created_at: string;
  updated_at: string;
};

export default function UserManagementRegistry() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Layout states
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list');
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchRef = useRef<React.ComponentRef<typeof Searchbar>>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<FlatList>(null);

  // OTP Verification States
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyUserId, setVerifyUserId] = useState<number | null>(null);
  const [verifyUserEmail, setVerifyUserEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const fetchUsers = async (query = '', pageNum = 1, isLoadMore = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const token = await AsyncStorage.getItem('companyToken');
      const baseUrl = `${API_BASE_URL}/company/users`;
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      params.append('page', String(pageNum));
      params.append('limit', '20');

      const response = await fetchJson(`${baseUrl}?${params.toString()}`, {
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
        showError(response.data?.message || 'Failed to load team users');
      }
    } catch {
      showError('Network error loading users');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchUsers(search, page + 1, true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUsers(search, 1, false);
    }, [search])
  );

  React.useEffect(() => {
    if (searchExpanded) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      Keyboard.dismiss();
    }
  }, [searchExpanded]);

  const handleOpenAdd = () => {
    router.push('/company/users/add-user');
  };

  const handleOpenEdit = (item: CompanyUser) => {
    router.push({
      pathname: '/company/users/edit-user',
      params: {
        id: item.id,
        name: item.name,
        email: item.email,
        mobile: item.mobile || '',
        address: item.address || '',
        role_id: item.role_id,
        role_name: item.role_name,
        country_id: item.country_id || '',
        country_name: item.country_name || '',
        state_id: item.state_id || '',
        state_name: item.state_name || '',
        city_id: item.city_id || '',
        city_name: item.city_name || '',
        is_active: String(item.is_active),
      },
    });
  };

  const handleSendVerification = async (userId: number, emailAddress: string) => {
    setSendingOtp(true);
    try {
      const token = await AsyncStorage.getItem('companyToken');
      const response = await fetchJson(`${API_BASE_URL}/company/users/${userId}/send-verification`, {
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
      showError('Network error sending verification.');
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
      const token = await AsyncStorage.getItem('companyToken');
      const response = await fetchJson(`${API_BASE_URL}/company/users/${verifyUserId}/verify-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      if (response.ok) {
        showSuccess('Email verified and user activated successfully!');
        setVerifyModalVisible(false);
        fetchUsers(search, 1, false);
      } else {
        showError(response.data?.message || 'Invalid OTP.');
      }
    } catch {
      showError('Network error verifying OTP.');
    } finally {
      setVerifying(false);
    }
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.tableHeaderCell, { width: 180 }]}>Name</Text>
      <Text style={[styles.tableHeaderCell, { width: 220 }]}>Email</Text>
      <Text style={[styles.tableHeaderCell, { width: 120 }]}>Role</Text>
      <Text style={[styles.tableHeaderCell, { width: 120 }]}>Status</Text>
      <Text style={[styles.tableHeaderCell, { width: 120 }]}>Verification</Text>
      <Text style={[styles.tableHeaderCell, { width: 120, textAlign: 'center' }]}>Actions</Text>
    </View>
  );

  const renderTableItem = ({ item }: { item: CompanyUser }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { width: 180 }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.tableCell, { width: 220 }]} numberOfLines={1}>
        {item.email}
      </Text>
      <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>
        {item.role_name}
      </Text>
      <Text style={[styles.tableCell, { width: 120, fontWeight: 'bold', color: item.is_active ? theme.colors.primary : theme.colors.error }]}>
        {item.is_active ? 'ACTIVE' : 'DISABLED'}
      </Text>
      <View style={{ width: 120 }}>
        {item.email_verified ? (
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>VERIFIED</Text>
        ) : (
          <Button
            mode="text"
            compact
            onPress={() => handleSendVerification(item.id, item.email)}
            disabled={sendingOtp}
            textColor={theme.colors.error}
            labelStyle={{ fontSize: 11 }}
          >
            Verify Email
          </Button>
        )}
      </View>
      <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        <Button
          mode="contained"
          compact
          onPress={() => handleOpenEdit(item)}
          buttonColor={theme.colors.secondaryContainer}
          style={styles.squareEditBtn}
          contentStyle={{ minWidth: 0, height: 32 }}
        >
          <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.onSecondaryContainer} />
        </Button>
      </View>
    </View>
  );

  const renderListItem = ({ item, index }: { item: CompanyUser; index: number }) => {
    const isLast = index === users.length - 1;
    return (
      <View style={[styles.listItem, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={styles.itemMain}>
          <Avatar.Icon
            icon="account"
            size={40}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.onPrimaryContainer}
          />
          <View style={styles.itemTextContainer}>
            <Text variant="titleMedium" style={styles.itemName}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.itemEmail}>
              {item.email} • <Text style={{ fontWeight: '700' }}>{item.role_name}</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <Text style={[styles.statusText, { color: item.is_active ? theme.colors.primary : theme.colors.error }]}>
                {item.is_active ? 'ACTIVE' : 'DISABLED'}
              </Text>
              <Text style={styles.itemEmail}>
                • {item.email_verified ? 'Verified' : 'Pending Verification'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.itemActions}>
          {!item.email_verified && (
            <Button
              mode="outlined"
              compact
              onPress={() => handleSendVerification(item.id, item.email)}
              disabled={sendingOtp}
              textColor={theme.colors.error}
              style={{ marginRight: 8 }}
            >
              Verify
            </Button>
          )}
          <Button
            mode="contained"
            compact
            onPress={() => handleOpenEdit(item)}
            buttonColor={theme.colors.secondaryContainer}
            style={styles.squareEditBtn}
            contentStyle={{ minWidth: 0, height: 32 }}
          >
            <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.onSecondaryContainer} />
          </Button>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <TopAppBar
        title="User Management"
        showBack
        onBackPress={() => router.back()}
        actions={
          <>
            <Appbar.Action
              icon="magnify"
              color={theme.colors.primary}
              onPress={() => setSearchExpanded(!searchExpanded)}
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
            placeholder="Search team users..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchbar}
            inputStyle={{ minHeight: 0 }}
            iconColor={theme.colors.onSurfaceVariant}
          />
        </View>
      )}

      <View style={styles.subheaderRow}>
        <Text style={styles.subheaderText}>Total records: {totalRecords}</Text>
      </View>

      {loading ? (
        <AppLoader message="Loading team users..." icon="database-sync-outline" />
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
                      No team members found.
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
                  No team members found.
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

      <FAB
        icon="plus"
        style={styles.fab}
        color={theme.colors.onPrimary}
        onPress={handleOpenAdd}
      />

      {/* OTP verification dialog */}
      <Portal>
        <Modal
          visible={verifyModalVisible}
          onDismiss={() => !verifying && setVerifyModalVisible(false)}
          contentContainerStyle={[
            styles.dialogContainer,
            isLargeScreen && { width: 500, left: '50%', marginLeft: -250, right: 'auto' },
          ]}
        >
          <Text variant="titleLarge" style={styles.dialogTitle}>
            Email Verification
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
            Please enter the 6-digit OTP code sent to: <Text style={{ fontWeight: '700' }}>{verifyUserEmail}</Text>
          </Text>

          <TextInput
            value={otp}
            onChangeText={setOtp}
            mode="outlined"
            maxLength={6}
            keyboardType="number-pad"
            placeholder="000000"
            style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
            outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
            activeOutlineColor={theme.colors.primary}
          />

          <View style={styles.dialogActions}>
            <Button
              mode="contained"
              onPress={handleVerifyOtp}
              disabled={verifying}
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
              style={styles.dialogSaveButton}
            >
              Verify OTP
            </Button>
            <Button
              mode="text"
              onPress={() => !verifying && setVerifyModalVisible(false)}
              disabled={verifying}
              style={styles.dialogCancelButton}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerBar: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    searchbar: {
      elevation: 0,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
      height: 44,
    },
    subheaderRow: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.dark ? '#1E293B' : '#F1F5F9',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    subheaderText: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
    },
    listCard: {
      flex: 1,
      margin: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      overflow: 'hidden',
      elevation: 1,
    },
    listContent: {
      flexGrow: 1,
    },
    listItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    itemMain: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    itemTextContainer: {
      flex: 1,
    },
    itemName: {
      fontWeight: '700',
      color: theme.colors.onSurface,
    },
    itemEmail: {
      color: theme.colors.onSurfaceVariant,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
    },
    itemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tableContainer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 8,
      overflow: 'hidden',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: theme.dark ? '#1E293B' : '#F1F5F9',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    tableHeaderCell: {
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    tableCell: {
      fontSize: 13,
      color: theme.colors.onSurface,
    },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
    },
    scrollTopContainer: {
      position: 'absolute',
      right: 16,
      bottom: 80,
      zIndex: 10,
    },
    scrollTopFab: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      elevation: 2,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
    },
    squareEditBtn: {
      borderRadius: 8,
      marginRight: 4,
    },
    dialogContainer: {
      backgroundColor: theme.colors.surface,
      padding: 24,
      borderRadius: 16,
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      margin: 16,
      elevation: 24,
      maxHeight: '85%',
    },
    dialogTitle: {
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 20,
      color: theme.colors.onSurface,
    },
    dialogActions: {
      marginTop: 20,
      gap: 12,
    },
    dialogSaveButton: {
      minWidth: 140,
      borderRadius: 12,
      alignSelf: 'center',
    },
    dialogCancelButton: {
      alignSelf: 'flex-end',
    },
  });
