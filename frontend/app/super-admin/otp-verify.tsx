import React, { useState, useEffect, useRef } from "react";
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
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopAppBar from "@super-admin/components/TopAppBar";
import { useToast } from "@utils/toast";
import { API_BASE_URL } from "@config";

const RESEND_SECONDS = 30;

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
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);       // verify in-flight
  const [verified, setVerified] = useState(false);     // for checkmark morph

  // Resend state
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load stored email
  useEffect(() => {
    (async () => {
      const storedEmail = await AsyncStorage.getItem("loginEmail");
      if (storedEmail) setEmail(storedEmail);
    })();
  }, []);

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
    if (!validate()) return;
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
        showToast(body.message || "Invalid OTP", "error");
      } else {
        if (body.token) await AsyncStorage.setItem("authToken", body.token);
        showToast(body.message || "Verified!", "success");
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
      showToast("Network error, please try again", "error");
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
        showToast(body?.message || "Failed to resend OTP", "error");
      } else {
        showToast(body?.message || "OTP resent", "success");
        setResendSeconds(RESEND_SECONDS); // restart timer
      }
    } catch {
      showToast("Network error while resending OTP", "error");
    } finally {
      setResending(false);
    }
  };

  const resendProgress =
    (RESEND_SECONDS - resendSeconds) / RESEND_SECONDS || 0;

  return (
    <View style={styles.wrapper}>
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
            color={theme.colors.primary}
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
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
                </Button>
                <View style={styles.resendProgressWrap}>
                  <ProgressBar
                    progress={resendProgress}
                    style={styles.resendProgress}
                  />
                </View>
              </View>

              {!!error && (
                <HelperText type="error" style={styles.helperText}>
                  {error}
                </HelperText>
              )}

              {/* Inline verifying status */}
              {loading && (
                <View style={styles.statusRow}>
                  <ActivityIndicator animating size="small" />
                  <Text style={styles.statusText}>Verifying OTP…</Text>
                </View>
              )}

              <Button
                mode="contained"
                onPress={handleVerify}
                loading={loading}
                disabled={loading || resending} // block while any request running
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
    wrapper: { flex: 1, backgroundColor: theme.colors.surfaceVariant },
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
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
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
