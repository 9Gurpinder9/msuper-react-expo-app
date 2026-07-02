import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import {
  Card,
  TextInput,
  Button,
  HelperText,
  useTheme,
  MD3Theme,
  ProgressBar,
  Portal,
  Text,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TopAppBar from '@company/components/TopAppBar';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';
import { logger } from '@utils/logger';

export default function CompanyForgotPassword() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const isDark = theme.dark;

  const backgroundGradient: [string, string, string] = isDark
    ? ['#090D1A', '#0F172A', '#1E293B']
    : ['#F8FAFC', '#F1F5F9', '#E2E8F0'];

  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading] = useState(false);

  const OTP_EXPIRE_MS = 3 * 60 * 1000;

  const resetFlow = useCallback(async () => {
    await AsyncStorage.multiRemove(['companyResetEmail', 'companyResetToken', 'companyResetStage', 'companyResetOtpExpiresAt']);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          await resetFlow();
          if (active) {
            setEmail('');
            setEmailErr('');
          }
        } catch (e) {
          logger.warn('Failed to clear reset flow on entry', { error: String(e) });
        }
      })();
      return () => {
        active = false;
      };
    }, [resetFlow])
  );

  const validate = () => {
    let ok = true;
    if (!email) {
      setEmailErr('Email is required');
      ok = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailErr('Enter a valid email');
      ok = false;
    } else setEmailErr('');
    return ok;
  };

  const handleSendOtp = async () => {
    if (!validate()) {
      showError('Please correct the highlighted fields.');
      return;
    }
    if (loading) return;
    setLoading(true);

    const url = `${API_BASE_URL}/company/auth/reset-password/request`;
    try {
      const res = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body: any = res.data ?? {};

      if (!res.ok) {
        if (body?.errors?.email) setEmailErr(body.errors.email);
        showError(body?.message || `Request failed (HTTP ${res.status})`);
        return;
      }

      try {
        const expiresAt = String(Date.now() + OTP_EXPIRE_MS);
        await AsyncStorage.multiSet([
          ['companyResetEmail', email],
          ['companyResetStage', 'otp'],
          ['companyResetOtpExpiresAt', expiresAt],
        ]);
        await AsyncStorage.removeItem('companyResetToken');
      } catch (e) {
        logger.warn('Failed to store company reset email', { error: String(e) });
      }

      showSuccess(body?.message || 'OTP sent to your email.');
      router.replace('/company/reset-otp');
    } catch (err: any) {
      const msg = err?.message || 'Network error';
      showError(
        `${msg}${Platform.OS === 'web' ? ' (check CORS & URL)' : ' (use LAN IP for API_BASE_URL on device)'}`
      );
      logger.error('Company reset request network exception', { message: msg, url });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
      <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.select({ ios: 'padding' })}>
        <TopAppBar title="Forgot Password" showBack onBackPress={() => router.replace('/company/login')} />

        <Portal>
          {loading && (
            <ProgressBar
              indeterminate
              style={[styles.topProgress, { top: insets.top }]}
              color={theme.colors.primary}
            />
          )}
        </Portal>

        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={kbVisible}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text style={styles.cardTitle}>Reset Your Password</Text>
                <Text variant="bodyMedium" style={styles.cardHint}>
                  Enter your registered company email to receive a 6-digit OTP.
                </Text>
                <Text style={styles.fieldLabel}>
                  <Text style={styles.requiredAsterisk}>* </Text>
                  Email Address
                </Text>
                <TextInput
                  placeholder="company@domain.com"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  outlineColor={emailErr ? theme.colors.error : (isDark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                  activeOutlineColor={emailErr ? theme.colors.error : theme.colors.primary}
                  cursorColor={theme.colors.primary}
                  selectionColor={theme.colors.primary}
                  error={!!emailErr}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="username"
                  autoComplete="email"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  left={
                    <TextInput.Icon
                      icon="email-outline"
                    />
                  }
                  editable={!loading}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                />
                {!!emailErr && (
                  <HelperText type="error" style={styles.helperText}>
                    {emailErr}
                  </HelperText>
                )}

                <Button
                  mode="contained"
                  onPress={handleSendOtp}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor={theme.colors.secondary}
                  textColor={theme.colors.onSecondary}
                  icon="send-outline"
                >
                  Send OTP Code
                </Button>
                <Button
                  mode="text"
                  onPress={async () => {
                    await resetFlow();
                    router.replace('/company/login');
                  }}
                  style={{ marginTop: 8 }}
                >
                  Back to Login
                </Button>
              </Card.Content>
            </Card>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: theme.colors.background },
    backgroundGradient: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 40,
    },
    topProgress: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 3,
      zIndex: 1000,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      shadowColor: '#0F172A',
      shadowOpacity: theme.dark ? 0.4 : 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      padding: 4,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    cardContent: {
      padding: 16,
    },
    cardHint: {
      marginBottom: 16,
      color: theme.colors.onSurfaceVariant,
      fontSize: 14,
      lineHeight: 20,
    },
    input: {
      marginBottom: 4,
      backgroundColor: theme.colors.surface,
    },
    inputOutline: {
      borderRadius: 12,
      borderWidth: 1,
    },
    inputContent: {
      minHeight: 50,
      fontSize: 15,
      color: theme.colors.onSurface,
    },
    helperText: { marginBottom: 4, marginTop: 2 },
    button: { marginTop: 16, borderRadius: 12 },
    buttonContent: { height: 50 },
    fieldLabel: {
      color: theme.colors.onSurface,
      fontWeight: '700',
      fontSize: 14,
      marginBottom: 8,
      marginTop: 12,
    },
    requiredAsterisk: {
      color: theme.colors.error,
      fontWeight: 'bold',
    },
  });
