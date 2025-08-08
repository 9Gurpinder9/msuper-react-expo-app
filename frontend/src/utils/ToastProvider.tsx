import React, { createContext, ReactNode, useState } from "react";
import { Snackbar, useTheme } from "react-native-paper";

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
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
        style={{
          backgroundColor:
            type === "success" ? theme.colors.primary : theme.colors.error,
        }}
      >
        {message}
      </Snackbar>
    </ToastContext.Provider>
  );
};
