// frontend/app/(app)/company/profile.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  ActivityIndicator,
  Portal,
  Surface,
  Divider,
} from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import TopAppBar from '@company/components/TopAppBar';
import AppLoader from '@components/AppLoader';
import { useToast } from '@utils/toast';
import { fetchJson } from '@utils/network';
import { API_BASE_URL } from '@config';
import type { AppTheme } from '../../../../src/theme/types';

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof atob !== 'undefined') {
      return JSON.parse(atob(base64));
    }
    // Fallback if atob is not global
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = base64.replace(/=+$/, '');
    let output = '';
    if (str.length % 4 === 1) throw new Error();
    for (let bc = 0, bs = 0, buffer = 0, idx = 0; idx < str.length; idx++) {
      const char = str.charAt(idx);
      const pos = chars.indexOf(char);
      if (pos === -1) continue;
      buffer = (buffer << 6) + pos;
      if (bc % 4 === 0) {
        bc++;
        continue;
      }
      const val = (buffer >> ((-2 * bc) & 6)) & 255;
      output += String.fromCharCode(val);
      bc++;
    }
    return JSON.parse(output);
  } catch {
    return null;
  }
}

export default function CompanyProfile() {
  const theme = useTheme<AppTheme>();
  const styles = makeStyles(theme);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields state
  const [mobile2, setMobile2] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [printName, setPrintName] = useState('');

  // 1. Get user role from token
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('companyToken');
        if (token) {
          const payload = decodeJwt(token);
          if (payload?.role === 'ADMIN') {
            setIsAdmin(true);
          }
        }
      } catch {}
    })();
  }, []);

  // 2. Fetch company profile details
  const { data: profileRes, isLoading, refetch } = useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('companyToken');
      const res = await fetchJson(`${API_BASE_URL}/company/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(res.data?.message || 'Failed to load profile');
      }
      return res.data?.company;
    },
  });

  // 3. Initialize editable fields when data loads
  useEffect(() => {
    if (profileRes) {
      setMobile2(profileRes.mobile2 || '');
      setGstNo(profileRes.gst_no || '');
      setPrintName(profileRes.print_name || '');
    }
  }, [profileRes]);

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('companyToken');
      const res = await fetchJson(`${API_BASE_URL}/company/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile2: mobile2.trim() || null,
          gst_no: gstNo.trim() || null,
          print_name: printName.trim() || null,
        }),
      });

      if (res.ok) {
        showSuccess('Profile updated successfully');
        queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      } else {
        showError(res.data?.message || 'Failed to save changes');
      }
    } catch {
      showError('Network error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <TopAppBar title="Company Profile" />
        <AppLoader message="Loading profile..." icon="office-building" />
      </View>
    );
  }

  const plan = profileRes?.subscription_plans;

  return (
    <View style={styles.wrapper}>
      <TopAppBar title="Company Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isLargeScreen ? { alignSelf: 'center', width: '70%', maxWidth: 1100, gap: 16 } : { gap: 16 }}>
          
          {/* 1. Subscription & Plan Info */}
          <Card style={[styles.card, styles.planCard]} mode="outlined">
            <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="crown-outline" size={32} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planLabel}>ACTIVE SUBSCRIPTION</Text>
                <Text style={styles.planName}>{plan?.name || 'No Plan Active'}</Text>
                <Text style={styles.planExpiry}>
                  Expires on: <Text style={{ fontWeight: '700' }}>{formatDate(profileRes?.expiry_date)}</Text>
                </Text>
              </View>
              {profileRes?.is_active && (
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text style={[styles.statusText, { color: theme.colors.onSecondaryContainer }]}>ACTIVE</Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* 2. Main Profile Form */}
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.formTitle}>
              Company Metadata
            </Text>

            <View style={styles.gridContainer}>
              {/* Row 1: Company ID & Company Name */}
              <View style={styles.formRow}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Company ID</Text>
                  <TextInput
                    value={String(profileRes?.id || '')}
                    mode="outlined"
                    editable={false}
                    outlineColor="transparent"
                    style={styles.disabledInput}
                  />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Company Name</Text>
                  <TextInput
                    value={profileRes?.name || ''}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
              </View>

              {/* Row 2: Owner Name & Email */}
              <View style={styles.formRow}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Owner Name</Text>
                  <TextInput
                    value={profileRes?.owner_name || ''}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Registered Email</Text>
                  <TextInput
                    value={profileRes?.email || ''}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
              </View>

              {/* Row 3: Mobile 1 & Category */}
              <View style={styles.formRow}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Primary Contact Mobile</Text>
                  <TextInput
                    value={profileRes?.mobile1 || ''}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Business Category</Text>
                  <TextInput
                    value={profileRes?.category_name || ''}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
              </View>

              {/* Row 4: Country, State, City */}
              <View style={styles.formRow}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Country</Text>
                  <TextInput
                    value={profileRes?.country_name || ''}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TextInput
                    value={profileRes?.state_name || ''}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <TextInput
                    value={profileRes?.city_name || ''}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
              </View>

              {/* Row 5: Validity Date & Expiry Date */}
              <View style={styles.formRow}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Validity Start Date</Text>
                  <TextInput
                    value={formatDate(profileRes?.validity_date)}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Expiry Date</Text>
                  <TextInput
                    value={formatDate(profileRes?.expiry_date)}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
              </View>

              {/* Row 6: Created At & Updated At */}
              <View style={styles.formRow}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Registered On</Text>
                  <TextInput
                    value={formatDate(profileRes?.created_at)}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Last Updated On</Text>
                  <TextInput
                    value={formatDate(profileRes?.updated_at)}
                    mode="outlined"
                    editable={false}
                    style={styles.disabledInput}
                  />
                </View>
              </View>
            </View>

            <Divider style={{ marginVertical: 8 }} />

            <Text variant="titleMedium" style={styles.formTitle}>
              Settings & Updatable Profile
            </Text>

            <View style={styles.gridContainer}>
              <View style={styles.formRow}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Secondary Mobile</Text>
                  <TextInput
                    value={mobile2}
                    onChangeText={setMobile2}
                    mode="outlined"
                    placeholder="Enter secondary mobile"
                    placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                    textColor={theme.colors.onSurface}
                    editable={isAdmin}
                    outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
                    style={!isAdmin && styles.disabledInput}
                  />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>GST Number</Text>
                  <TextInput
                    value={gstNo}
                    onChangeText={setGstNo}
                    mode="outlined"
                    placeholder="Enter GST Number"
                    placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                    textColor={theme.colors.onSurface}
                    editable={isAdmin}
                    outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
                    style={!isAdmin && styles.disabledInput}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Company Print Name</Text>
                  <TextInput
                    value={printName}
                    onChangeText={setPrintName}
                    mode="outlined"
                    placeholder="Enter company print name"
                    placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                    textColor={theme.colors.onSurface}
                    editable={isAdmin}
                    outlineColor={theme.dark ? 'rgba(255,255,255,0.55)' : '#64748B'}
                    style={!isAdmin && styles.disabledInput}
                  />
                </View>
              </View>
            </View>

            {isAdmin && (
              <Button
                mode="contained"
                onPress={handleSave}
                disabled={saving}
                style={styles.saveBtn}
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onSecondary}
              >
                Save Changes
              </Button>
            )}
          </View>
        </View>
      </ScrollView>

      {saving && (
        <Portal>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' }]}>
            <AppLoader message="Saving changes..." icon="database-sync-outline" transparent />
          </View>
        </Portal>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    card: {
      borderRadius: 14,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
    },
    planCard: {
      borderWidth: 1.5,
      paddingVertical: 4,
    },
    iconContainer: {
      height: 56,
      width: 56,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    planLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.8,
    },
    planName: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.onSurface,
      marginVertical: 2,
    },
    planExpiry: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    formContainer: {
      backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 14,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      gap: 16,
    },
    formTitle: {
      fontWeight: '800',
      color: theme.colors.onSurface,
      fontSize: 16,
      marginBottom: 4,
      letterSpacing: -0.2,
    },
    gridContainer: {
      gap: 12,
    },
    formRow: {
      flexDirection: Platform.OS === 'web' ? 'row' : 'column',
      gap: 12,
    },
    fieldWrap: {
      flex: 1,
      gap: 4,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
    },
    disabledInput: {
      opacity: 0.75,
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    saveBtn: {
      borderRadius: 8,
      alignSelf: 'center',
      minWidth: 140,
      marginTop: 20,
    },
  });
