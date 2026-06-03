import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  View,
  Pressable,
} from 'react-native';
import {
  Card,
  TextInput,
  Button,
  useTheme,
  MD3Theme,
  ActivityIndicator,
  Text,
  ProgressBar,
  Portal,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

const RESEND_SECONDS = 180;
const OTP_EXPIRE_MS = 3 * 60 * 1000;

export default function ResetOtp() {
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const isDark = theme.dark;

  const backgroundGradient: [string, string, string] = isDark
    ? ['#090D1A', '#0F172A', '#1E293B']
    : ['#F8FAFC', '#F1F5F9', '#E2E8F0'];

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const expireTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const didNotifyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [storedEmail, stage, expiresAtRaw] = await Promise.all([
          AsyncStorage.getItem('resetEmail'),
          AsyncStorage.getItem('resetStage'),
          AsyncStorage.getItem('resetOtpExpiresAt'),
        ]);
        if (!active) return;
        if (!storedEmail) {
          if (!didNotifyRef.current) {
            showError('Reset session expired. Please start again.');
            didNotifyRef.current = true;
          }
          router.replace('/super-admin/forgot-password');
          return;
        }
        if (!expiresAtRaw) {
          if (!didNotifyRef.current) {
            showError('OTP expired. Please start again.');
            didNotifyRef.current = true;
          }
          router.replace('/super-admin/forgot-password');
          return;
        }
        const expiresAt = Number(expiresAtRaw);
        if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
          await AsyncStorage.multiRemove(['resetEmail', 'resetToken', 'resetStage', 'resetOtpExpiresAt']);
          if (!didNotifyRef.current) {
            showError('OTP expired. Please start again.');
            didNotifyRef.current = true;
          }
          router.replace('/super-admin/forgot-password');
          return;
        }
        if (stage && stage !== 'otp') {
          router.replace('/super-admin/forgot-password');
          return;
        }
        setEmail(storedEmail);
        setExpiresIn(Math.ceil((expiresAt - Date.now()) / 1000));
      })();
      return () => {
        active = false;
      };
    }, [router, showError])
  );

  useEffect(() => {
    if (expiresIn === null) return;
    if (expiresIn <= 0) {
      (async () => {
        await AsyncStorage.multiRemove(['resetEmail', 'resetToken', 'resetStage', 'resetOtpExpiresAt']);
        showError('OTP verification period expired.');
        router.replace('/super-admin/forgot-password');
      })();
      return;
    }
    expireTimerRef.current = setTimeout(() => {
      setExpiresIn((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    };
  }, [expiresIn, router, showError]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendSeconds]);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      showError('Please enter a valid 6-digit OTP');
      return;
    }
    if (loading) return;
    setLoading(true);

    const url = `${API_BASE_URL}/super-admin/reset-password/verify-otp`;
    try {
      const res = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const body: any = res.data ?? {};
      if (!res.ok) {
        showError(body?.message || 'Verification failed');
        return;
      }

      setVerified(true);
      if (body.resetToken) {
        await AsyncStorage.setItem('resetToken', body.resetToken);
        await AsyncStorage.setItem('resetStage', 'confirm');
      }
      showSuccess(body?.message || 'OTP verified successfully');
      router.replace('/super-admin/reset-password');
    } catch (err: any) {
      showError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || loading) return;
    setResending(true);

    const url = `${API_BASE_URL}/super-admin/reset-password/send-otp`;
    try {
      const res = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body: any = res.data ?? {};
      if (!res.ok) {
        showError(body?.message || 'Failed to resend OTP');
      } else {
        showSuccess(body?.message || 'OTP resent');
        const expiresAt = String(Date.now() + OTP_EXPIRE_MS);
        await AsyncStorage.setItem('resetOtpExpiresAt', expiresAt);
        setExpiresIn(Math.ceil(OTP_EXPIRE_MS / 1000));
        setResendSeconds(RESEND_SECONDS);
      }
    } catch {
      showError('Network error while resending OTP');
    } finally {
      setResending(false);
    }
  };

  const resendProgress = (RESEND_SECONDS - resendSeconds) / RESEND_SECONDS || 0;
  const formatRemaining = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={Keyboard.dismiss} style={StyleSheet.absoluteFill} pointerEvents="box-only" />

      <Portal>
        {(loading || resending) && (
          <ProgressBar
            indeterminate
            style={[styles.topProgress, { top: insets.top }]}
            color={theme.colors.primary}
          />
        )}
      </Portal>

      <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.select({ ios: 'padding' })}>
        <TopAppBar title="Verify Reset OTP" showBack onBackPress={() => router.replace('/super-admin/forgot-password')} />
        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="always"
            scrollEnabled={kbVisible}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text style={styles.cardTitle}>Enter Verification Code</Text>
                <Text style={styles.cardHint}>
                  Enter the 6-digit OTP sent to {email}.
                </Text>
                <TextInput
                  label="OTP Code"
                  value={otp}
                  onChangeText={setOtp}
                  mode="outlined"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                  editable={!loading && !resending}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  outlineColor={isDark ? '#334155' : '#E2E8F0'}
                  activeOutlineColor={theme.colors.primary}
                  cursorColor={theme.colors.primary}
                  selectionColor={theme.colors.primary}
                  left={
                    <TextInput.Icon
                      icon={({ size, color }) => (
                        <MaterialCommunityIcons name="key" size={size} color={color} />
                      )}
                    />
                  }
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                />
                {expiresIn !== null && (
                  <Text style={styles.expiryText}>
                    Code expires in {formatRemaining(expiresIn)}
                  </Text>
                )}

                <View style={styles.resendRow}>
                  <Button
                    mode="text"
                    onPress={handleResend}
                    disabled={resendSeconds > 0 || resending || loading}
                    compact
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons name="refresh" size={size} color={color} />
                    )}
                  >
                    {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend OTP'}
                  </Button>
                  <View style={styles.resendProgressWrap}>
                    <ProgressBar
                      progress={resendProgress}
                      style={styles.resendProgress}
                      color={theme.colors.primary}
                    />
                  </View>
                </View>

                {loading && (
                  <View style={styles.statusRow}>
                    <ActivityIndicator animating size="small" color={theme.colors.primary} />
                    <Text style={styles.statusText}>Verifying OTP...</Text>
                  </View>
                )}

                <Button
                  mode="contained"
                  onPress={handleVerify}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.onPrimary}
                  icon={
                    verified
                      ? ({ size, color }) => (
                          <MaterialCommunityIcons name="check-circle" size={size} color={color} />
                        )
                      : undefined
                  }
                >
                  {verified ? 'Verified' : 'Verify'}
                </Button>

                <Button
                  mode="text"
                  onPress={async () => {
                    await AsyncStorage.multiRemove(['resetEmail', 'resetToken', 'resetStage', 'resetOtpExpiresAt']);
                    router.replace('/super-admin/forgot-password');
                  }}
                  style={{ marginTop: 8 }}
                >
                  Back to Email
                </Button>
              </Card.Content>
            </Card>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
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
    expiryText: {
      marginTop: 4,
      marginBottom: 12,
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    statusText: { marginLeft: 8, color: theme.colors.onSurface },
    resendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
    },
    resendProgressWrap: { flex: 1 },
    resendProgress: { height: 4, borderRadius: 2 },
    button: { marginTop: 12, borderRadius: 12 },
    buttonContent: { height: 50 },
  });
