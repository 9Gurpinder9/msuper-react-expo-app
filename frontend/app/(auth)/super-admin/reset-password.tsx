import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';
import { logger } from '@utils/logger';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ResetPassword() {
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
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordErr, setNewPasswordErr] = useState('');
  const [confirmPasswordErr, setConfirmPasswordErr] = useState('');
  const [loading, setLoading] = useState(false);
  const didNotifyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [storedEmail, storedToken, stage] = await Promise.all([
          AsyncStorage.getItem('resetEmail'),
          AsyncStorage.getItem('resetToken'),
          AsyncStorage.getItem('resetStage'),
        ]);
        if (!active) return;
        if (!storedEmail || !storedToken) {
          logger.warn('Missing reset session, redirecting to forgot password');
          if (!didNotifyRef.current) {
            showError('Reset session expired. Please start again.');
            didNotifyRef.current = true;
          }
          router.replace('/super-admin/forgot-password');
          return;
        }
        if (stage && stage !== 'confirm') {
          logger.warn('Missing reset session, redirecting to forgot password');
          if (!didNotifyRef.current) {
            showError('Reset session expired. Please start again.');
            didNotifyRef.current = true;
          }
          router.replace('/super-admin/forgot-password');
          return;
        }
        if (!stage) {
          await AsyncStorage.setItem('resetStage', 'confirm');
        }
        setEmail(storedEmail);
        setResetToken(storedToken);
      })();
      return () => {
        active = false;
      };
    }, [router, showError])
  );

  const validate = () => {
    let ok = true;
    if (!newPassword) {
      setNewPasswordErr('New password is required');
      ok = false;
    } else if (!passwordRegex.test(newPassword)) {
      setNewPasswordErr('Min 8 chars, uppercase, lowercase, number, and symbol required');
      ok = false;
    } else setNewPasswordErr('');

    if (!confirmPassword) {
      setConfirmPasswordErr('Confirm password is required');
      ok = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordErr('Passwords do not match');
      ok = false;
    } else setConfirmPasswordErr('');

    return ok;
  };

  const handleResetPassword = async () => {
    if (!validate()) {
      showError('Please correct the highlighted fields.');
      return;
    }
    if (loading) return;
    setLoading(true);

    const url = `${API_BASE_URL}/super-admin/reset-password/confirm`;
    try {
      const res = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });
      const body: any = res.data ?? {};
      if (!res.ok) {
        if (body?.errors?.newPassword) setNewPasswordErr(body.errors.newPassword);
        if (body?.errors?.confirmPassword) setConfirmPasswordErr(body.errors.confirmPassword);
        showError(body?.message || `Request failed (HTTP ${res.status})`);
        return;
      }

      try {
        await AsyncStorage.multiRemove(['resetEmail', 'resetToken', 'resetStage', 'resetOtpExpiresAt']);
      } catch (e) {
        logger.warn('Failed to clear reset session', { error: String(e) });
      }

      showSuccess(body?.message || 'Password updated successfully.');
      router.replace('/super-admin/login');
    } catch (err: any) {
      const msg = err?.message || 'Network error';
      showError(
        `${msg}${Platform.OS === 'web' ? ' (check CORS & URL)' : ' (use LAN IP for API_BASE_URL on device)'}`
      );
      logger.error('Reset password network exception', { message: msg, url });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
      <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.select({ ios: 'padding' })}>
        <TopAppBar title="Set New Password" showBack onBackPress={() => router.replace('/super-admin/login')} />

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
                <Text style={styles.cardTitle}>Create a New Password</Text>
                <Text variant="bodyMedium" style={styles.cardHint}>
                  Use a strong password with uppercase, lowercase, number, and symbol.
                </Text>
                <TextInput
                  label="Email"
                  value={email}
                  mode="outlined"
                  editable={false}
                  disabled
                  left={
                    <TextInput.Icon
                      icon={({ size, color }) => (
                        <MaterialCommunityIcons name="email" size={size} color={color} />
                      )}
                    />
                  }
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                />
                <TextInput
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  mode="outlined"
                  secureTextEntry={!showNewPassword}
                  error={!!newPasswordErr}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="next"
                  outlineColor={isDark ? '#334155' : '#E2E8F0'}
                  activeOutlineColor={theme.colors.primary}
                  cursorColor={theme.colors.primary}
                  selectionColor={theme.colors.primary}
                  left={
                    <TextInput.Icon
                      icon={({ size, color }) => (
                        <MaterialCommunityIcons name="lock" size={size} color={color} />
                      )}
                    />
                  }
                  right={
                    newPassword.length > 0 ? (
                      <TextInput.Icon
                        icon={({ size }) => (
                          <MaterialCommunityIcons
                            name={showNewPassword ? 'eye-off' : 'eye'}
                            size={size}
                            color={(theme as any).colors.onSurfaceVariant || theme.colors.onSurface}
                          />
                        )}
                        onPress={() => setShowNewPassword((p) => !p)}
                        forceTextInputFocus={false}
                      />
                    ) : undefined
                  }
                  editable={!loading}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                />
                {!!newPasswordErr && (
                  <HelperText type="error" style={styles.helperText}>
                    {newPasswordErr}
                  </HelperText>
                )}
                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  error={!!confirmPasswordErr}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  outlineColor={isDark ? '#334155' : '#E2E8F0'}
                  activeOutlineColor={theme.colors.primary}
                  cursorColor={theme.colors.primary}
                  selectionColor={theme.colors.primary}
                  left={
                    <TextInput.Icon
                      icon={({ size, color }) => (
                        <MaterialCommunityIcons name="lock-check" size={size} color={color} />
                      )}
                    />
                  }
                  right={
                    confirmPassword.length > 0 ? (
                      <TextInput.Icon
                        icon={({ size }) => (
                          <MaterialCommunityIcons
                            name={showConfirmPassword ? 'eye-off' : 'eye'}
                            size={size}
                            color={(theme as any).colors.onSurfaceVariant || theme.colors.onSurface}
                          />
                        )}
                        onPress={() => setShowConfirmPassword((p) => !p)}
                        forceTextInputFocus={false}
                      />
                    ) : undefined
                  }
                  editable={!loading}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                />
                {!!confirmPasswordErr && (
                  <HelperText type="error" style={styles.helperText}>
                    {confirmPasswordErr}
                  </HelperText>
                )}

                <Button
                  mode="contained"
                  onPress={handleResetPassword}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.onPrimary}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons name="check-circle" size={size} color={color} />
                  )}
                >
                  Update Password
                </Button>
                <Button
                  mode="text"
                  onPress={async () => {
                    await AsyncStorage.multiRemove(['resetEmail', 'resetToken', 'resetStage', 'resetOtpExpiresAt']);
                    router.replace('/super-admin/login');
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
  });
