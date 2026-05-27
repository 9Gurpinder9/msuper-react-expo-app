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
  View,
} from 'react-native';
import {
  TextInput,
  Button,
  HelperText,
  useTheme,
  MD3Theme,
  ProgressBar,
  Portal,
  Text,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@utils/toast';
import { API_BASE_URL, HCAPTCHA_ENABLED, HCAPTCHA_SITE_KEY } from '@config';
import HcaptchaWidget from '../../../src/components/HcaptchaWidget';
import { lightColors } from '../../../src/theme/colors';

import { logger } from '@utils/logger';
import { fetchJson } from '@utils/network';

export default function Login() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const layout: 'mobile' | 'tablet' | 'desktop' =
    windowWidth >= 1200 ? 'desktop' : windowWidth >= 760 ? 'tablet' : 'mobile';
  const styles = makeStyles(theme, layout);
  const isDark = theme.dark;
  const backgroundGradient: [string, string, string] = isDark
    ? ['#0b1530', '#0b1633', '#0b1530']
    : [theme.colors.surfaceVariant, theme.colors.primaryContainer, theme.colors.background];
  const accentBg = isDark ? lightColors.primary : theme.colors.primary;
  const accentFg = isDark ? lightColors.onPrimary : theme.colors.onPrimary;
  const buttonColor = accentBg;
  const buttonTextColor = accentFg;
  const inputOutlineColor = isDark ? '#2b3b64' : 'rgba(1, 34, 90, 0.12)';
  const inputActiveOutlineColor = theme.colors.primary;
  const inputCursorColor = theme.colors.primary;
  const inputPlaceholderColor = isDark ? 'rgba(199, 213, 240, 0.46)' : 'rgba(94, 74, 63, 0.42)';

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

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
        <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.select({ ios: 'padding' })}>
          <Portal>
            {loading && (
              <ProgressBar
                indeterminate
                style={[styles.topProgress, { top: insets.top }]}
                color={theme.colors.secondary}
              />
            )}
          </Portal>

          <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient}>
            <ScrollView
              contentContainerStyle={[
                styles.scrollContainer,
                kbVisible ? styles.scrollContainerKeyboard : null,
              ]}
              keyboardShouldPersistTaps="handled"
              scrollEnabled
            >
              <View style={styles.centerWrap}>
                <View style={styles.brandWrap}>
                  <View style={[styles.logoShell, { backgroundColor: accentBg }]}>
                    <MaterialCommunityIcons
                      name="shield-account"
                      size={layout === 'mobile' ? 32 : 36}
                      color={accentFg}
                    />
                  </View>
                  <Text style={styles.title}>Admin Portal</Text>
                  <Text style={styles.subtitle}>
                    Sign in to manage the Mukti Super App ecosystem
                  </Text>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    placeholder="admin@system.com"
                    placeholderTextColor={inputPlaceholderColor}
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    outlineColor={inputOutlineColor}
                    activeOutlineColor={inputActiveOutlineColor}
                    cursorColor={inputCursorColor}
                    selectionColor={inputCursorColor}
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
                        icon="account-outline"
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

                  <View style={styles.fieldHeaderRow}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <Button
                      mode="text"
                      compact
                      disabled={loading}
                      onPress={() => router.push('/super-admin/forgot-password')}
                      labelStyle={styles.forgotLabel}
                      style={styles.forgotButton}
                    >
                      Forget Password?
                    </Button>
                  </View>

                  <TextInput
                    placeholder="********"
                    placeholderTextColor={inputPlaceholderColor}
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    outlineColor={inputOutlineColor}
                    activeOutlineColor={inputActiveOutlineColor}
                    cursorColor={inputCursorColor}
                    selectionColor={inputCursorColor}
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
                          <MaterialCommunityIcons name="key" size={size} color={color} />
                        )}
                      />
                    }
                    right={
                      password.length > 0 ? (
                        <TextInput.Icon
                          icon={({ size, color }) => (
                            <MaterialCommunityIcons
                              name={showPassword ? 'eye-off' : 'eye'}
                              size={size}
                              color={color}
                            />
                          )}
                          onPress={() => setShowPassword((p) => !p)}
                          forceTextInputFocus={false}
                        />
                      ) : undefined
                    }
                    editable={!loading}
                    style={styles.input}
                    contentStyle={styles.inputContent}
                    outlineStyle={styles.inputOutline}
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
                    buttonColor={buttonColor}
                    textColor={buttonTextColor}
                    testID="login-button"
                    accessibilityLabel="Authorize"
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons name="shield-check" size={size} color={color} />
                    )}
                  >
                    Authorize
                  </Button>
                </View>

                <Text style={styles.accessOnlyText}>ADMINISTRATIVE ACCESS ONLY</Text>
              </View>
            </ScrollView>
          </LinearGradient>
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

const makeStyles = (theme: MD3Theme, layout: 'mobile' | 'tablet' | 'desktop') =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: theme.dark ? '#0b1530' : theme.colors.surfaceVariant },
    backgroundGradient: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: layout === 'mobile' ? 20 : 28,
      paddingTop: layout === 'desktop' ? 112 : layout === 'tablet' ? 92 : 80,
      paddingBottom: layout === 'desktop' ? 48 : 28,
    },
    scrollContainerKeyboard: {
      justifyContent: 'flex-start',
    },
    centerWrap: {
      width: '100%',
      alignItems: 'center',
      maxWidth: layout === 'desktop' ? 470 : layout === 'tablet' ? 560 : 380,
      marginTop: layout === 'desktop' ? 36 : 24,
    },
    brandWrap: {
      alignItems: 'center',
      marginBottom: layout === 'mobile' ? 24 : 26,
    },
    logoShell: {
      width: layout === 'mobile' ? 70 : 76,
      height: layout === 'mobile' ? 70 : 76,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      marginBottom: 12,
      elevation: theme.dark ? 0 : 2,
      shadowColor: '#000',
      shadowOpacity: theme.dark ? 0.18 : 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    title: {
      color: theme.colors.onBackground,
      fontSize: layout === 'desktop' ? 46 : layout === 'tablet' ? 36 : 28,
      lineHeight: layout === 'desktop' ? 52 : layout === 'tablet' ? 42 : 34,
      fontWeight: '800',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      fontSize: layout === 'desktop' ? 20 : layout === 'tablet' ? 18 : 15,
      lineHeight: layout === 'desktop' ? 28 : layout === 'tablet' ? 26 : 22,
      textAlign: 'center',
      maxWidth: 420,
      paddingHorizontal: 8,
      fontWeight: '600',
    },
    formCard: {
      width: '100%',
      backgroundColor: theme.dark ? '#142a49' : theme.colors.surface,
      borderRadius: 28,
      paddingHorizontal: layout === 'mobile' ? 16 : 22,
      paddingVertical: layout === 'mobile' ? 20 : 24,
      borderWidth: theme.dark ? 1 : 0,
      borderColor: theme.dark ? 'rgba(255,255,255,0.12)' : 'transparent',
      elevation: theme.dark ? 0 : 3,
      shadowColor: '#000',
      shadowOpacity: theme.dark ? 0.28 : 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    fieldHeaderRow: {
      marginTop: 6,
      marginBottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldLabel: {
      color: theme.dark ? theme.colors.onSurface : theme.colors.onSurface,
      fontWeight: '700',
      fontSize: 16,
      marginBottom: 8,
    },
    forgotButton: {
      marginRight: -6,
      marginVertical: -6,
    },
    forgotLabel: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      opacity: theme.dark ? 0.72 : 0.62,
      fontSize: layout === 'mobile' ? 13 : 14,
    },
    topProgress: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 3,
      zIndex: 1000,
    },
    input: {
      marginBottom: 6,
      backgroundColor: theme.dark ? '#1c2c46' : theme.colors.surface,
    },
    inputOutline: {
      borderRadius: 16,
      borderWidth: 1,
    },
    inputContent: {
      minHeight: 54,
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    helperText: {
      marginBottom: 8,
      marginTop: 0,
      paddingHorizontal: 2,
    },
    button: {
      marginTop: 8,
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    buttonContent: {
      height: 54,
    },
    accessOnlyText: {
      marginTop: 26,
      color: theme.colors.onSurfaceVariant,
      opacity: theme.dark ? 0.55 : 0.45,
      letterSpacing: 3.4,
      fontSize: layout === 'mobile' ? 11 : 12,
      fontWeight: '700',
      textAlign: 'center',
    },
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
