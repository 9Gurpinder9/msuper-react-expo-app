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
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TopAppBar from '@super-admin/components/TopAppBar';
import { useToast } from '@utils/toast';
import { API_BASE_URL } from '@config';
import { fetchJson } from '@utils/network';
import { logger } from '@utils/logger';

export default function ForgotPassword() {
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
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading] = useState(false);

  const resetFlow = useCallback(async () => {
    await AsyncStorage.multiRemove(['resetEmail', 'resetToken', 'resetStage']);
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

    const url = `${API_BASE_URL}/super-admin/reset-password/request`;
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
        await AsyncStorage.multiSet([
          ['resetEmail', email],
          ['resetStage', 'otp'],
        ]);
        await AsyncStorage.removeItem('resetToken');
      } catch (e) {
        logger.warn('Failed to store reset email', { error: String(e) });
      }

      showSuccess(body?.message || 'OTP sent to your email.');
      router.replace('/super-admin/reset-otp');
    } catch (err: any) {
      const msg = err?.message || 'Network error';
      showError(
        `${msg}${Platform.OS === 'web' ? ' (check CORS & URL)' : ' (use LAN IP for API_BASE_URL on device)'}`
      );
      logger.error('Reset request network exception', { message: msg, url });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
      <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.select({ ios: 'padding' })}>
        <LinearGradient
          colors={[theme.colors.primary, (theme as any).colors.surfaceVariant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <TopAppBar title="Forgot Password" />

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
              title="Reset Your Password"
              left={(props) => (
                <MaterialCommunityIcons
                  name="email-lock"
                  size={props.size}
                  color={theme.colors.onSurface}
                />
              )}
            />
            <Card.Content>
              <Text variant="bodyMedium" style={{ marginBottom: 8, opacity: 0.8 }}>
                Enter your registered email to receive a 6-digit OTP.
              </Text>
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
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
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

              <Button
                mode="contained"
                onPress={handleSendOtp}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                icon={({ size, color }) => (
                  <MaterialCommunityIcons name="send" size={size} color={color} />
                )}
              >
                Send OTP
              </Button>
              <Button
                mode="text"
                onPress={async () => {
                  await resetFlow();
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
      borderRadius: 12,
      padding: 8,
      backgroundColor: theme.colors.surface,
      elevation: 2,
    },
    input: { marginBottom: 12 },
    helperText: { marginBottom: 8 },
    button: { marginTop: 16 },
    buttonContent: { height: 48 },
  });
