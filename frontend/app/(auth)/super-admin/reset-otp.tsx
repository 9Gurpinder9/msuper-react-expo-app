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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';

const RESEND_SECONDS = 60;

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

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const didNotifyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [storedEmail, stage] = await Promise.all([
          AsyncStorage.getItem('resetEmail'),
          AsyncStorage.getItem('resetStage'),
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
        if (stage && stage !== 'otp') {
          if (!didNotifyRef.current) {
            showError('Reset session expired. Please start again.');
            didNotifyRef.current = true;
          }
          router.replace('/super-admin/forgot-password');
          return;
        }
        if (!stage) {
          await AsyncStorage.setItem('resetStage', 'otp');
        }
        setEmail(storedEmail);
      })();
      return () => {
        active = false;
      };
    }, [router, showError])
  );

  useEffect(() => {
    if (resendSeconds <= 0) return;
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setResendSeconds((s) => Math.max(0, s - 1)),
      1000
    );
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
  }, [resendSeconds]);

  const validate = () => {
    if (!otp) {
      showError('OTP is required.');
      return false;
    }
    return true;
  };

  const handleVerify = async () => {
    if (!validate() || loading) return;
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
        showError(body?.message || `Invalid OTP (HTTP ${res.status})`);
        return;
      }
      if (!body.resetToken) {
        showError('Reset session missing token. Please try again.');
        return;
      }
      await AsyncStorage.multiSet([
        ['resetToken', body.resetToken],
        ['resetStage', 'confirm'],
      ]);
      showSuccess(body?.message || 'OTP verified.');
      setVerified(true);
      router.replace('/super-admin/reset-password');
    } catch {
      showError('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || resending || loading) return;
    setResending(true);
    const url = `${API_BASE_URL}/super-admin/reset-password/request`;
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
        setResendSeconds(RESEND_SECONDS);
      }
    } catch {
      showError('Network error while resending OTP');
    } finally {
      setResending(false);
    }
  };

  const resendProgress = (RESEND_SECONDS - resendSeconds) / RESEND_SECONDS || 0;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[theme.colors.primary, (theme as any).colors.surfaceVariant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Pressable onPress={Keyboard.dismiss} style={StyleSheet.absoluteFill} pointerEvents="box-only" />

      <Portal>
        {(loading || resending) && (
          <ProgressBar
            indeterminate
            style={[styles.topProgress, { top: insets.top }]}
            color={(theme as any).colors.info}
          />
        )}
      </Portal>

      <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.select({ ios: 'padding' })}>
        <TopAppBar title="Verify Reset OTP" />
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="always"
          scrollEnabled={kbVisible}
        >
          <Card style={styles.card}>
            <Card.Content>
              <Text style={{ marginBottom: 8, opacity: 0.8 }}>
                Enter the 6-digit OTP sent to your email.
              </Text>
              <TextInput
                label="OTP"
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
                left={
                  <TextInput.Icon
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons name="key" size={size} color={color} />
                    )}
                  />
                }
                style={styles.input}
              />

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
                    color={(theme as any).colors.info}
                  />
                </View>
              </View>

              {loading && (
                <View style={styles.statusRow}>
                  <ActivityIndicator animating size="small" color={(theme as any).colors.info} />
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
                  await AsyncStorage.multiRemove(['resetEmail', 'resetToken', 'resetStage']);
                  router.replace('/super-admin/forgot-password');
                }}
                style={{ marginTop: 8 }}
              >
                Back to Email
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: theme.colors.background },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    topProgress: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 3,
      zIndex: 1000,
    },
    card: {
      width: '90%',
      maxWidth: 400,
      alignSelf: 'center',
      borderRadius: 12,
      padding: 8,
      backgroundColor: theme.colors.surface,
      elevation: 2,
    },
    input: { marginBottom: 8 },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    statusText: { marginLeft: 8 },
    resendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 12,
    },
    resendProgressWrap: { flex: 1 },
    resendProgress: { height: 4, borderRadius: 2 },
    button: { marginTop: 12 },
    buttonContent: { height: 48 },
  });
