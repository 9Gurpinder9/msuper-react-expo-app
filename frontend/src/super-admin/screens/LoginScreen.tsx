// frontend/src/super-admin/screens/LoginScreen.tsx

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
// expo/vector-icons import
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import TopAppBar from "../components/TopAppBar";
import { SuperAdminStackParamList } from "../navigation";
import { API_BASE_URL } from "@config";

type NavProp = NativeStackNavigationProp<SuperAdminStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
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
        if (body.errors) {
          setEmailErr(body.errors.email ?? "");
          setPasswordErr(body.errors.password ?? "");
        }
        if (body.message) setGeneralErr(body.message);
      } else {
        navigation.replace("Dashboard");
      }
    } catch {
      setGeneralErr("Network error, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
              left={
                // props only contains `size`
                (props) => (
                  <MaterialDesignIcons
                    name="shield-account"
                    size={props.size}
                    // pick a color from your theme instead
                    color={theme.colors.onSurface}
                  />
                )
              }
            />

            <Card.Content>
              {generalErr !== "" && (
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
                // wrap your vector‐icon in the Paper Icon component:
                left={
                  <TextInput.Icon
                    icon={({ size, color }) => (
                      <MaterialDesignIcons
                        name="email"
                        size={size}
                        color={color}
                      />
                    )}
                  />
                }
                style={styles.input}
              />

              {emailErr !== "" && (
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
                left={
                  <TextInput.Icon
                    icon={({ size, color }) => (
                      <MaterialDesignIcons
                        name="lock"
                        size={size}
                        color={color}
                      />
                    )}
                  />
                }
                style={styles.input}
              />

              {passwordErr !== "" && (
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
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.surfaceVariant,
    },
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
