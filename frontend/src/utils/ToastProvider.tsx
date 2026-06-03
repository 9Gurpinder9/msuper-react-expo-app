// frontend/src/utils/ToastProvider.tsx
import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from "react-native";
import { Portal, Surface, Text } from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

// ─── Types ───────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "warning" | "info";

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

export const ToastContext = createContext<ToastContextProps | undefined>(undefined);

// ─── Semantic pill themes (light bg + border + text + icon) ──────────────────
const THEMES: Record<
  ToastType,
  {
    background: string;
    border: string;
    text: string;
    icon: string;
    iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  }
> = {
  success: {
    background: "#f0fdf4", // green-50
    border:     "#bbf7d0", // green-200
    text:       "#166534", // green-800
    icon:       "#16a34a", // green-600
    iconName:   "check-circle-outline",
  },
  error: {
    background: "#fef2f2", // red-50
    border:     "#fecaca", // red-200
    text:       "#991b1b", // red-800
    icon:       "#dc2626", // red-600
    iconName:   "alert-circle-outline",
  },
  warning: {
    background: "#fffbeb", // amber-50
    border:     "#fef3c7", // amber-200
    text:       "#92400e", // amber-800
    icon:       "#d97706", // amber-600
    iconName:   "alert-outline",
  },
  info: {
    background: "#f0f9ff", // sky-50
    border:     "#bae6fd", // sky-200
    text:       "#075985", // sky-800
    icon:       "#0284c7", // sky-600
    iconName:   "information-outline",
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visible,  setVisible]  = useState(false);
  const [message,  setMessage]  = useState("");
  const [type,     setType]     = useState<ToastType>("success");
  const [duration, setDuration] = useState(4000);
  const [toastKey, setToastKey] = useState(0);

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideOut = useCallback(
    (onDone?: () => void) => {
      Animated.timing(slideAnim, {
        toValue:         -120,
        duration:        250,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onDone?.();
      });
    },
    [slideAnim]
  );

  const dismiss = useCallback(() => slideOut(), [slideOut]);

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue:         Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 12 : 12,
        bounciness:      8,
        speed:           12,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss
      timerRef.current = setTimeout(() => slideOut(), duration);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else {
      Animated.timing(slideAnim, {
        toValue:         -120,
        duration:        250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback(
    (msg: string, t: ToastType = "success", durationMs?: number) => {
      // If already visible, slide out then re-show
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(msg);
      setType(t);
      setDuration(typeof durationMs === "number" ? durationMs : 5000);
      setToastKey((prev) => prev + 1);
      setVisible(true);
    },
    []
  );

  const contextValue = useMemo(() => ({ showToast }), [showToast]);
  const theme = THEMES[type];

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {visible && (
        <Portal key={toastKey}>
          <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.animatedContainer,
                { transform: [{ translateY: slideAnim }] },
              ]}
              pointerEvents="auto"
            >
              <Surface
                style={[
                  styles.pill,
                  {
                    backgroundColor: theme.background,
                    borderColor:     theme.border,
                  },
                ]}
                elevation={2}
              >
                <MaterialCommunityIcons
                  name={theme.iconName}
                  size={18}
                  color={theme.icon}
                  style={styles.icon}
                />
                <Text
                  style={[styles.text, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {message}
                </Text>
                <MaterialCommunityIcons
                  name="close"
                  size={15}
                  color={theme.icon + "AA"}
                  style={styles.closeIcon}
                  onPress={dismiss}
                />
              </Surface>
            </Animated.View>
          </SafeAreaView>
        </Portal>
      )}
    </ToastContext.Provider>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    position:  "absolute",
    top:       0,
    left:      0,
    right:     0,
    alignItems: "center",
    zIndex:    99999,
    elevation: 999,
  },
  animatedContainer: {
    width:    "90%",
    maxWidth: 420,
    alignItems: "center",
  },
  pill: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius:   16,
    borderWidth:    1,
    shadowColor:    "#000",
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.1,
    shadowRadius:   5,
    width:          "100%",
  },
  icon: {
    marginRight: 8,
    flexShrink:  0,
  },
  text: {
    flex:          1,
    fontSize:      14,
    fontWeight:    "600",
    letterSpacing: 0.2,
    flexShrink:    1,
  },
  closeIcon: {
    marginLeft: 8,
    flexShrink: 0,
  },
});
