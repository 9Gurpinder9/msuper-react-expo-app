import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import {
  Card,
  TextInput,
  Button,
  HelperText,
  useTheme,
  MD3Theme,
  ProgressBar,
  Portal,
} from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopAppBar from "@super-admin/components/TopAppBar";
import { useToast } from "@utils/toast";
import { API_BASE_URL } from "@config";

import { logger } from "@utils/logger";
import { fetchJson } from "@utils/network";

export default function Login() {
  const router = useRouter();
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [generalErr, setGeneralErr] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let ok = true;
    if (!email) {
      setEmailErr("Email is required");
      ok = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailErr("Enter a valid email");
      ok = false;
    } else setEmailErr("");
    if (!password) {
      setPasswordErr("Password is required");
      ok = false;
    } else setPasswordErr("");
    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setGeneralErr("");

    const url = `${API_BASE_URL}/super-admin/login`;

    try {
      const res = await fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body: any = res.data ?? {};

      if (!res.ok) {
        if (body?.errors) {
          setEmailErr(body.errors.email ?? "");
          setPasswordErr(body.errors.password ?? "");
        }
        if (body?.message) setGeneralErr(body.message);
        else setGeneralErr(`Login failed (HTTP ${res.status})`);
        return;
      }

      // Save email for OTP screen (backend expects email + otp)
      try {
        await AsyncStorage.setItem("loginEmail", email);
      } catch (e) {
        console.warn("Failed to store email for OTP verification", e);
      }

      showToast(body?.message || "OTP sent!", "success");
      router.replace("/super-admin/otp-verify");
    } catch (err: any) {
      const msg = err?.message || "Network error";
      setGeneralErr(
        `${msg}${Platform.OS === "web" ? " (check CORS & URL)" : " (use LAN IP for API_BASE_URL on device)"}`,
      );
      logger.error("Login network exception", { message: msg, url });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback
      onPress={Keyboard.dismiss}
      disabled={Platform.OS === "web"}
    >
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.select({ ios: "padding" })}
      >
        <TopAppBar title="Login" />

        {/* Thin top indeterminate progress while loading */}
        <Portal>
          {loading && (
            <ProgressBar
              indeterminate
              style={[styles.topProgress, { top: insets.top }]}
              color={theme.colors.primary}
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
              left={(props) => (
                <MaterialCommunityIcons
                  name="shield-account"
                  size={props.size}
                  color={theme.colors.onSurface}
                />
              )}
            />
            <Card.Content>
              {!!generalErr && (
                <HelperText type="error" style={styles.helperText}>
                  {generalErr}
                </HelperText>
              )}
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                error={!!emailErr}
                left={
                  <TextInput.Icon
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons
                        name="email"
                        size={size}
                        color={color}
                      />
                    )}
                  />
                }
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
                secureTextEntry
                error={!!passwordErr}
                left={
                  <TextInput.Icon
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons
                        name="lock"
                        size={size}
                        color={color}
                      />
                    )}
                  />
                }
                style={styles.input}
              />
              {!!passwordErr && (
                <HelperText type="error" style={styles.helperText}>
                  {passwordErr}
                </HelperText>
              )}
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading || !email || !password}              // prevent submit when invalid
                style={styles.button}
                contentStyle={styles.buttonContent}
                testID="login-button"
                icon={({ size, color }) => (
                  <MaterialCommunityIcons
                    name="login"
                    size={size}
                    color={color}
                  />
                )}
              >
                Log in
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
    input: { marginBottom: 12 },
    helperText: { marginBottom: 8 },
    button: { marginTop: 16 },
    buttonContent: { height: 48 },
  });
