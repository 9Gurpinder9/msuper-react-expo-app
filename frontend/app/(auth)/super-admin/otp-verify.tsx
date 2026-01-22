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
  HelperText,
  useTheme,
  MD3Theme,
  ActivityIndicator,
  Text,
  ProgressBar,
  Portal,
} from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import TopAppBar from "@super-admin/components/TopAppBar";
import { useToast } from "@utils/toast";
import { API_BASE_URL } from "@config";

const RESEND_SECONDS = 60;
const OTP_EXPIRE_MS = 3 * 60 * 1000;

 export default function OTPVerify() {
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKbVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKbVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const router = useRouter();
  const { showToast, showError, showSuccess } = useToast();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // verify in-flight
  const [verified, setVerified] = useState(false); // for checkmark morph
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const expireTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resend state
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load stored email + OTP expiry
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [storedEmail, expiresAtRaw] = await Promise.all([
          AsyncStorage.getItem("loginEmail"),
          AsyncStorage.getItem("loginOtpExpiresAt"),
        ]);
        if (!active) return;
        if (!storedEmail || !expiresAtRaw) {
          showError("OTP session expired. Please log in again.");
          router.replace("/super-admin/login");
          return;
        }
        const expiresAt = Number(expiresAtRaw);
        if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
          await AsyncStorage.multiRemove(["loginEmail", "loginOtpExpiresAt"]);
          showError("OTP expired. Please log in again.");
          router.replace("/super-admin/login");
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
      AsyncStorage.multiRemove(["loginEmail", "loginOtpExpiresAt"]).catch(() => {});
      showError("OTP expired. Please log in again.");
      router.replace("/super-admin/login");
      return;
    }
    expireTimerRef.current && clearTimeout(expireTimerRef.current);
    expireTimerRef.current = setTimeout(
      () => setExpiresIn((s) => (s === null ? null : Math.max(0, s - 1))),
      1000,
    );
    return () => {
      expireTimerRef.current && clearTimeout(expireTimerRef.current);
    };
  }, [expiresIn, router, showError]);

  // Countdown for resend
  useEffect(() => {
    if (resendSeconds <= 0) return;
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setResendSeconds((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
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
    if (loading) return; // guard double tap
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }), // backend expects both
      });
      const body = await res.json();
      if (!res.ok) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        showError(body.message || "Invalid OTP");
      } else {
        if (body.token) await AsyncStorage.setItem("authToken", body.token);
        await AsyncStorage.multiRemove(["loginEmail", "loginOtpExpiresAt"]);
        showSuccess(body.message || "Verified!");
        setVerified(true); // morph button icon to check
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        setTimeout(() => {
          router.replace("/super-admin/dashboard");
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
      const res = await fetch(`${API_BASE_URL}/super-admin/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(body?.message || "Failed to resend OTP");
      } else {
        showSuccess(body?.message || "OTP resent");
        const expiresAt = String(Date.now() + OTP_EXPIRE_MS);
        await AsyncStorage.setItem("loginOtpExpiresAt", expiresAt);
        setExpiresIn(Math.ceil(OTP_EXPIRE_MS / 1000));
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
      {/* Subtle gradient background */}
      <LinearGradient
        colors={[theme.colors.primary, (theme as any).colors.surfaceVariant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Background-only tap to dismiss keyboard (doesn't wrap the input) */}
      <Pressable
        onPress={Keyboard.dismiss}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-only"
      />

      {/* Optional top thin progress while verifying or resending */}
      <Portal>
        {(loading || resending) && (
          <ProgressBar
            indeterminate
            style={[styles.topProgress, { top: insets.top }]}
            color={(theme as any).colors.info}
          />
        )}
      </Portal>

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.select({ ios: "padding" })}
      >
        <TopAppBar title="Verify OTP" />
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="always"
          scrollEnabled={kbVisible}
        >
          <Card style={styles.card}>
            <Card.Content>
              <Text style={{ marginBottom: 8, opacity: 0.8 }}>Enter the 6-digit code we sent to your email.</Text>
              <TextInput
                label="OTP"
                value={otp}
                onChangeText={setOtp}
                mode="outlined"
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
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons
                        name="key"
                        size={size}
                        color={color}
                      />
                    )}
                  />
                }
                style={styles.input}
              />
              {expiresIn !== null && (
                <Text style={{ marginBottom: 8, opacity: 0.8 }}>
                  OTP expires in {formatRemaining(expiresIn)}
                </Text>
              )}

              {/* Resend timer + progress */}
              <View style={styles.resendRow}>
                <Button
                  mode="text"
                  onPress={handleResend}
                  disabled={resendSeconds > 0 || resending || loading}
                  compact
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name="refresh"
                      size={size}
                      color={color}
                    />
                  )}
                >
                  {resendSeconds > 0
                    ? `Resend in ${resendSeconds}s`
                    : "Resend OTP"}
                </Button>
                <View style={styles.resendProgressWrap}>
                  <ProgressBar
                    progress={resendProgress}
                    style={styles.resendProgress}
                    color={(theme as any).colors.info}
                  />
                </View>
              </View>

              {/* Validation feedback is surfaced via toast; no inline banner */}

              {/* Inline verifying status */}
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
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={size}
                          color={color}
                        />
                      )
                    : undefined
                }
              >
                {verified ? "Verified" : "Verify"}
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
      justifyContent: "flex-start",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    topProgress: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 3,
      zIndex: 1000,
    },
    card: {
      width: "90%",
      maxWidth: 400,
      alignSelf: "center",
      borderRadius: 12,
      padding: 8,
      backgroundColor: theme.colors.surface,
      elevation: 2,
    },
    input: { marginBottom: 8 },
    helperText: { marginBottom: 8 },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    statusText: { marginLeft: 8 },
    resendRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      gap: 12,
    },
    resendProgressWrap: { flex: 1 },
    resendProgress: { height: 4, borderRadius: 2 },
    button: { marginTop: 12 },
    buttonContent: { height: 48 },
  });





