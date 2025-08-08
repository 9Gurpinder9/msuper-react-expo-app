// frontend/app/super-admin/otp-verify.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import TopAppBar from "@super-admin/components/TopAppBar";
import { useToast } from "@utils/toast";
import { API_BASE_URL } from "@config";

export default function OTPVerify() {
  const router = useRouter();
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message || "Invalid OTP", "error");
      } else {
        body.token && (await AsyncStorage.setItem("authToken", body.token));
        showToast(body.message || "Verified!", "success");
        router.replace("/super-admin/dashboard");
      }
    } catch {
      showToast("Network error, please try again", "error");
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
        <TopAppBar title="Verify OTP" />
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              mode="outlined"
              error={!!error}
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
            {!!error && (
              <HelperText type="error" style={styles.helperText}>
                {error}
              </HelperText>
            )}
            <Button
              mode="contained"
              onPress={handleVerify}
              loading={loading}
              style={styles.button}
            >
              Verify
            </Button>
          </Card.Content>
        </Card>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.surfaceVariant,
      padding: 16,
    },
    card: {
      marginTop: 24,
      borderRadius: 12,
      padding: 8,
    },
    input: { marginBottom: 12 },
    helperText: { marginBottom: 8 },
    button: { marginTop: 16, height: 48 },
  });
