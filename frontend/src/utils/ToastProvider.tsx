// frontend/src/utils/ToastProvider.tsx
import React, { createContext, ReactNode, useState } from "react";
import { StyleSheet } from "react-native";
import { Snackbar, useTheme, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error";

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextProps | undefined>(
  undefined
);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("success");

  const showToast = (msg: string, t: ToastType = "success") => {
    setMessage(msg);
    setType(t);
    setVisible(true);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Portal>
        <Snackbar
          visible={visible}
          onDismiss={() => setVisible(false)}
          duration={3000}
          // Position: TOP-CENTER (safe-area aware)
          wrapperStyle={[styles.snackWrapper, { top: insets.top + 12 }]}
          style={[
            styles.snack,
            {
              backgroundColor:
                type === "success" ? theme.colors.primary : theme.colors.error,
            },
          ]}
        >
          {message}
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
});
