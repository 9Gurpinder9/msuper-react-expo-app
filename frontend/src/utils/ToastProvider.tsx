// frontend/src/utils/ToastProvider.tsx
import React, { createContext, ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Snackbar, useTheme, Portal, Text } from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { AppTheme } from "../theme/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

export const ToastContext = createContext<ToastContextProps | undefined>(
  undefined
);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const theme = useTheme() as unknown as AppTheme;
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("success");
  const [duration, setDuration] = useState<number>(3000);

  const showToast = (msg: string, t: ToastType = "success", durationMs?: number) => {
    setMessage(msg);
    setType(t);
    setDuration(typeof durationMs === "number" ? durationMs : 3000);
    setVisible(true);
  };

  // Ensure sufficient text contrast when we override Snackbar background
  const snackbarTheme = React.useMemo(() => {
    const onSurface =
      type === "success"
        ? theme.colors.onSuccess
        : type === "warning"
        ? theme.colors.onWarning
        : type === "info"
        ? theme.colors.onInfo
        : theme.colors.onError;
    return { ...(theme as any), colors: { ...(theme.colors as any), onSurface } };
  }, [theme, type]);

  const fg =
    type === "success"
      ? (theme.colors as any).onSuccess
      : type === "warning"
      ? (theme.colors as any).onWarning
      : type === "info"
      ? (theme.colors as any).onInfo
      : (theme.colors as any).onError;

  const iconName =
    type === "success"
      ? ("check-circle" as const)
      : type === "warning"
      ? ("alert" as const)
      : type === "info"
      ? ("information" as const)
      : ("alert-circle" as const);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Portal>
        <Snackbar
          theme={snackbarTheme}
          visible={visible}
          onDismiss={() => setVisible(false)}
          duration={duration}
          // Position: TOP-CENTER (safe-area aware)
          wrapperStyle={[styles.snackWrapper, { top: insets.top + 12 }]}
          style={[
            styles.snack,
            {
              backgroundColor:
                type === "success"
                  ? theme.colors.success
                  : type === "warning"
                  ? theme.colors.warning
                  : type === "info"
                  ? theme.colors.info
                  : theme.colors.error,
            },
          ]}
        >
          <View style={styles.contentRow}>
            <MaterialCommunityIcons
              name={iconName}
              size={18}
              color={fg}
              style={styles.icon}
            />
            <Text style={[styles.text, { color: fg }]}>{message}</Text>
          </View>
        </Snackbar>
      </Portal>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  // Absolute wrapper spanning width; we only set "top" dynamically
  snackWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  // Center the snackbar surface
  snack: {
    alignSelf: "center",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: { marginRight: 8 },
  text: { fontWeight: "600" },
});
