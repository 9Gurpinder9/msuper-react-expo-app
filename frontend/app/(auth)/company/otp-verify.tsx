import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  View,
  Pressable,
} from "react-native";
import {
  Card,
  TextInput,
  Button,
  useTheme,
  MD3Theme,
  Text,
  ProgressBar,
  Portal,
} from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';

import TopAppBar from "@company/components/TopAppBar";
import { useToast } from "@utils/toast";
import { API_BASE_URL } from "@config";

const RESEND_SECONDS = 180;

export default function CompanyOTPVerify() {
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbVisible(false));
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

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(__DEV__ ? "123456" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const expireTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Guard: skip session check once OTP is already verified
  const verifiedRef = useRef(false);

  // Resend state
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load stored email + OTP expiry
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        // Skip if we already verified — prevents false "session expired" toast on navigate
        if (verifiedRef.current) return;
        const [storedEmail, expiresAtRaw] = await Promise.all([
          AsyncStorage.getItem("companyLoginEmail"),
          AsyncStorage.getItem("companyLoginOtpExpiresAt"),
        ]);
        if (!active) return;
        if (!storedEmail || !expiresAtRaw) {
          showError("OTP session expired. Please log in again.");
          router.replace("/company/login");
          return;
        }
        const expiresAt = Number(expiresAtRaw);
        if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
        await AsyncStorage.multiRemove(["companyLoginEmail", "companyLoginOtpExpiresAt", "companyRememberMe"]);
          showError("OTP expired. Please log in again.");
          router.replace("/company/login");
          return;
        }
        setEmail(storedEmail);
        setExpiresIn(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
      })();
      return () => {
        active = false;
      };
    }, [router, showError])
  );

  useEffect(() => {
    if (expiresIn === null) return;
    if (expiresIn <= 0) {
      AsyncStorage.multiRemove(["companyLoginEmail", "companyLoginOtpExpiresAt"]).catch(() => {});
      showError("OTP expired. Please log in again.");
      router.replace("/company/login");
      return;
    }
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    expireTimerRef.current = setTimeout(
      () => setExpiresIn((s) => (s === null ? null : Math.max(0, s - 1))),
      1000,
    );
    return () => {
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    };
  }, [expiresIn, router, showError]);

  // Countdown for resend
  useEffect(() => {
    if (resendSeconds <= 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setResendSeconds((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendSeconds]);

  const validate = () => {
    if (!otp) {
      setError("OTP is required");
      return false;
    }
    setError("");
    return true;
  };

  const handleVerify = async () => {
    if (!validate()) {
      showError("Please enter the OTP code.");
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const rememberMe = await AsyncStorage.getItem("companyRememberMe") === "true";
      const res = await fetch(`${API_BASE_URL}/company/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, rememberMe }),
      });
      const body = await res.json();
      if (!res.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showError(body.message || "Invalid OTP");
      } else {
        if (body.token) {
          await AsyncStorage.setItem("companyToken", body.token);
          await AsyncStorage.setItem("companyEmail", email);
        }
        await AsyncStorage.multiRemove(["companyLoginEmail", "companyLoginOtpExpiresAt", "companyRememberMe"]);
        verifiedRef.current = true;
        showSuccess(body.message || "Verified!");
        setVerified(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          router.replace("/company/dashboard");
        }, 650);
      }
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || resending) return;
    setResending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/company/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(body?.message || "Failed to resend OTP");
      } else {
        showSuccess(body?.message || "OTP resent");
        const expiresAt = String(Date.now() + 3 * 60 * 1000); // 3 minutes TTL
        await AsyncStorage.setItem("companyLoginOtpExpiresAt", expiresAt);
        setExpiresIn(180);
        setResendSeconds(RESEND_SECONDS); // restart timer
      }
    } catch {
      showError("Network error while resending OTP");
    } finally {
      setResending(false);
    }
  };

  const resendProgress = (RESEND_SECONDS - resendSeconds) / RESEND_SECONDS || 0;
  const formatRemaining = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={Keyboard.dismiss}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-only"
      />

      <Portal>
        {(loading || resending) && (
          <ProgressBar
            indeterminate
            style={[styles.topProgress, { top: insets.top }]}
            color={theme.colors.primary}
          />
        )}
      </Portal>

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.select({ ios: "padding" })}
      >
        <TopAppBar title="Verify OTP" showBack onBackPress={() => router.back()} />
        <LinearGradient colors={backgroundGradient} style={styles.backgroundGradient}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="always"
            scrollEnabled={kbVisible}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text style={styles.cardHint}>Enter the 6-digit verification code sent to your email.</Text>
                <Text style={styles.fieldLabel}>
                  <Text style={styles.requiredAsterisk}>* </Text>
                  OTP Verification Code
                </Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  mode="outlined"
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                  textColor={theme.colors.onSurface}
                  outlineColor={error ? theme.colors.error : (isDark ? 'rgba(255,255,255,0.55)' : '#64748B')}
                  activeOutlineColor={error ? theme.colors.error : theme.colors.primary}
                  cursorColor={theme.colors.primary}
                  selectionColor={theme.colors.primary}
                  error={!!error}
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
                      icon="lock-outline"
                    />
                  }
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                />
                {!!error && (
                  <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
                )}
                
                <View style={styles.expiresRow}>
                  {expiresIn !== null && (
                    <Text style={styles.expiresText}>
                      Code expires in: <Text style={styles.timerBold}>{formatRemaining(expiresIn)}</Text>
                    </Text>
                  )}
                </View>

                {/* Resend timer + progress */}
                <View style={styles.resendRow}>
                  <Button
                    mode="text"
                    onPress={handleResend}
                    disabled={resendSeconds > 0 || resending || loading}
                    compact
                    labelStyle={styles.resendLabel}
                    icon="refresh"
                  >
                    {resendSeconds > 0
                      ? `Resend in ${resendSeconds}s`
                      : "Resend Code"}
                  </Button>
                  <View style={styles.resendProgressWrap}>
                    <ProgressBar
                      progress={resendProgress}
                      style={styles.resendProgress}
                      color={theme.colors.primary}
                    />
                  </View>
                </View>

                <Button
                  mode="contained"
                  onPress={handleVerify}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor={theme.colors.secondary}
                  textColor={theme.colors.onSecondary}
                  icon={
                    verified
                      ? "check-circle"
                      : "shield-check"
                  }
                >
                  {verified ? "Verified" : "Verify Authenticity"}
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
      justifyContent: "flex-start",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 40,
    },
    topProgress: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 3,
      zIndex: 1000,
    },
    card: {
      width: "100%",
      maxWidth: 400,
      alignSelf: "center",
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
    cardContent: {
      padding: 16,
    },
    cardHint: {
      marginBottom: 16,
      color: theme.colors.onSurfaceVariant,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
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
    fieldLabel: {
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    requiredAsterisk: {
      color: theme.colors.error,
      fontWeight: 'bold',
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 2,
      marginBottom: 4,
    },
    expiresRow: {
      marginVertical: 10,
    },
    expiresText: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
    },
    timerBold: {
      fontWeight: '700',
      color: theme.colors.primary,
    },
    resendRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
      gap: 12,
    },
    resendLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    resendProgressWrap: { flex: 1 },
    resendProgress: { height: 4, borderRadius: 2 },
    button: { marginTop: 12, borderRadius: 12, minWidth: 140 },
    buttonContent: { height: 50 },
  });
