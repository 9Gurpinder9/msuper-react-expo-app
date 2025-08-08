// frontend/app/super-admin/login.tsx
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
} from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";

import TopAppBar from "@super-admin/components/TopAppBar";
import { useToast } from "@utils/toast";
import { API_BASE_URL } from "@config";

export default function Login() {
  const router = useRouter();
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKbVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKbVisible(false)
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
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        body.errors && setEmailErr(body.errors.email || "");
        body.errors && setPasswordErr(body.errors.password || "");
        body.message && setGeneralErr(body.message);
      } else {
        showToast(body.message || "OTP sent!", "success");
        router.replace("/super-admin/otp-verify");
      }
    } catch {
      setGeneralErr("Network error, please try again");
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
                style={styles.button}
                contentStyle={styles.buttonContent}
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
