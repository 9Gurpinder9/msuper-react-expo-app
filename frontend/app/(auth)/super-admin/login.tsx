import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Modal,
  Pressable,
  useWindowDimensions,
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
import * as Haptics from 'expo-haptics';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '@utils/toast';
import { API_BASE_URL, HCAPTCHA_ENABLED, HCAPTCHA_SITE_KEY } from '@config';
import HcaptchaWidget from '../../../src/components/HcaptchaWidget';

import { logger } from '@utils/logger';
import { fetchJson } from '@utils/network';

export default function Login() {
  const router = useRouter();
  const { showToast, showError, showSuccess } = useToast();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [captchaErr, setCaptchaErr] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = React.useRef<any>(null);
  const OTP_EXPIRE_MS = 3 * 60 * 1000;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          await AsyncStorage.multiRemove(['loginEmail', 'loginOtpExpiresAt']);
          if (active) {
            setEmail('');
            setPassword('');
            setEmailErr('');
            setPasswordErr('');
          }
        } catch {}
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const validateCredentials = () => {
    let ok = true;
    if (!email) {
      setEmailErr('Email is required');
      ok = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailErr('Enter a valid email');
      ok = false;
    } else setEmailErr('');
    if (!password) {
      setPasswordErr('Password is required');
      ok = false;
    } else setPasswordErr('');
    return ok;
  };

  const handleLogin = async () => {
    if (!validateCredentials()) {
      showError('Please correct the highlighted fields.');
      return;
    }
    if (HCAPTCHA_ENABLED) {
      if (!HCAPTCHA_SITE_KEY) {
        setCaptchaErr('Captcha site key is missing. Contact support.');
        showError('Captcha is not configured.');
        return;
      }
      if (!captchaToken) {
        setCaptchaErr('Please complete the captcha.');
        setCaptchaOpen(true);
        return;
      }
    }
    setLoading(true);

    const url = `${API_BASE_URL}/super-admin/login`;

    try {
      const payload: Record<string, string> = { email, password };
      if (HCAPTCHA_ENABLED && captchaToken) {
        payload.captchaToken = captchaToken;
      }
      const res = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body: any = res.data ?? {};

      if (!res.ok) {
        if (body?.errors) {
          setEmailErr(body.errors.email ?? '');
          setPasswordErr(body.errors.password ?? '');
        }
        const errMsg = body?.message || `Login failed (HTTP ${res.status})`;
        showError(errMsg);
        setCaptchaToken('');
        setCaptchaResetKey((k) => k + 1);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        return;
      }

      // Save email for OTP screen (backend expects email + otp)
      try {
        const expiresAt = String(Date.now() + OTP_EXPIRE_MS);
        await AsyncStorage.multiSet([
          ['loginEmail', email],
          ['loginOtpExpiresAt', expiresAt],
        ]);
      } catch (e) {
        logger.warn('Failed to store login OTP session', { error: String(e) });
      }

      showSuccess(body?.message || 'OTP sent!');
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      router.replace('/super-admin/otp-verify');
    } catch (err: any) {
      const msg = err?.message || 'Network error';
      showError(
        `${msg}${Platform.OS === 'web' ? ' (check CORS & URL)' : ' (use LAN IP for API_BASE_URL on device)'}`
      );
      logger.error('Login network exception', { message: msg, url });
    } finally {
      setLoading(false);
    }
  };

  // Keep login button enabled by default; validation will run on press
  const validEmail = /^\S+@\S+\.\S+$/.test(email);

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
        <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.select({ ios: 'padding' })}>
        <TopAppBar title="Login" />

        {/* Thin top indeterminate progress while loading */}
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
              title="Super-Admin Login"
              titleStyle={styles.cardTitle}
              left={(props) => (
                <MaterialCommunityIcons
                  name="shield-account"
                  size={props.size}
                  color={theme.colors.onPrimary}
                />
              )}
            />
            <Card.Content style={styles.cardContent}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                error={!!emailErr}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                autoComplete="email"
                returnKeyType="next"
                enablesReturnKeyAutomatically
                onSubmitEditing={() => passwordRef.current?.focus()}
                left={
                  <TextInput.Icon
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons name="email" size={size} color={color} />
                    )}
                  />
                }
                editable={!loading}
                style={styles.input}
              />
              {!!emailErr && (
                <HelperText type="error" style={styles.helperText}>
                  {emailErr}
                </HelperText>
              )}
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                ref={passwordRef}
                secureTextEntry={!showPassword}
                error={!!passwordErr}
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                left={
                  <TextInput.Icon
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons name="lock" size={size} color={color} />
                    )}
                  />
                }
                right={
                  password.length > 0 ? (
                    <TextInput.Icon
                      icon={({ size }) => (
                        <MaterialCommunityIcons
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={size}
                          color={(theme as any).colors.onSurfaceVariant || theme.colors.onSurface}
                        />
                      )}
                      onPress={() => setShowPassword((p) => !p)}
                      forceTextInputFocus={false}
                    />
                  ) : undefined
                }
                editable={!loading}
                style={styles.input}
              />
              {!!passwordErr && (
                <HelperText type="error" style={styles.helperText}>
                  {passwordErr}
                </HelperText>
              )}
              {HCAPTCHA_ENABLED && !HCAPTCHA_SITE_KEY ? (
                <HelperText type="error" style={styles.helperText}>
                  Missing HCAPTCHA_SITE_KEY in frontend config.
                </HelperText>
              ) : null}
              {!!captchaErr && (
                <HelperText type="error" style={styles.helperText}>
                  {captchaErr}
                </HelperText>
              )}
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                testID="login-button"
                accessibilityLabel="Log in"
                icon={({ size, color }) => (
                  <MaterialCommunityIcons name="login" size={size} color={color} />
                )}
              >
                Log in
              </Button>
              <Button
                mode="text"
                onPress={() => router.push('/super-admin/forgot-password')}
                style={{ marginTop: 8 }}
              >
                Forgot password?
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {HCAPTCHA_ENABLED ? (
        <Modal
        visible={captchaOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCaptchaOpen(false)}
      >
        <Pressable style={styles.captchaOverlay} onPress={() => setCaptchaOpen(false)}>
          <Pressable style={styles.captchaModal} onPress={() => {}}>
            <Text variant="titleMedium" style={styles.captchaTitle}>
              hCaptcha Verification
            </Text>
            <ScrollView
              contentContainerStyle={styles.captchaScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <HcaptchaWidget
                siteKey={HCAPTCHA_SITE_KEY}
                height={Math.min(420, Math.max(320, Math.floor(windowHeight * 0.45)))}
                resetSignal={captchaResetKey}
                onToken={(token) => {
                  setCaptchaToken(token);
                  setCaptchaErr('');
                  setCaptchaOpen(false);
                }}
                onExpire={() => {
                  setCaptchaToken('');
                  setCaptchaErr('Captcha expired. Please retry.');
                }}
                onError={(message) => {
                  setCaptchaToken('');
                  setCaptchaErr(message);
                }}
              />
            </ScrollView>
            <Button mode="text" onPress={() => setCaptchaOpen(false)} style={styles.captchaClose}>
              Close
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}
    </>
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
    captchaOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    captchaModal: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      maxHeight: '85%',
    },
    captchaTitle: { marginBottom: 12 },
    captchaClose: { marginTop: 8, alignSelf: 'flex-end' },
    captchaScrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
  });
