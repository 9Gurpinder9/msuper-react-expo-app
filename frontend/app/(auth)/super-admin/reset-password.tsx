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
        <TopAppBar title="Set New Password" />

        <Portal>
          {loading && (
            <ProgressBar
              indeterminate
              style={[styles.topProgress, { top: insets.top }]}
              color={(theme as any).colors.info}
            />
          )}
        </Portal>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={kbVisible}
        >
          <Card style={styles.card}>
            <Card.Title
              title="Create a New Password"
              titleStyle={styles.cardTitle}
              left={(props) => (
                <MaterialCommunityIcons
                  name="lock-reset"
                  size={props.size}
                  color={theme.colors.onPrimary}
                />
              )}
            />
            <Card.Content style={styles.cardContent}>
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
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
      borderRadius: 16,
      padding: 6,
      backgroundColor: theme.colors.primary,
      elevation: 2,
    },
    cardTitle: {
      color: theme.colors.onPrimary,
    },
    cardContent: {
      backgroundColor: theme.colors.onPrimary,
      borderRadius: 12,
      padding: 16,
      margin: 8,
    },
    cardHint: {
      marginBottom: 8,
      color: theme.colors.onSurface,
      opacity: 0.85,
    },
    input: { marginBottom: 12 },
    helperText: { marginBottom: 8 },
    button: { marginTop: 16 },
    buttonContent: { height: 48 },
  });
