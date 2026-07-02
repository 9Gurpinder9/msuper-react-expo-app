import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Easing,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Portal, useTheme, MD3Theme } from 'react-native-paper';

type TopSlideDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export default function TopSlideDialog({
  visible,
  onDismiss,
  title,
  children,
  actions,
}: TopSlideDialogProps) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { height } = useWindowDimensions();

  const [shouldRender, setShouldRender] = useState(visible);

  // Animated values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-height)).current; // Start offscreen

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Run animations in parallel
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0.5, // Dim background
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, // Slide to final position (top: 40 + translateY: 0)
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animations
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -height, // Slide back offscreen
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [visible, height]);

  if (!shouldRender) return null;

  return (
    <Portal>
      <View style={StyleSheet.absoluteFillObject}>
        {/* Backdrop overlay */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        </Animated.View>

        {/* Dialog container with slide animation */}
        <Animated.View
          style={[
            styles.dialogContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.dialogCard}>
            <Animated.Text style={styles.dialogTitle}>{title}</Animated.Text>
            <View style={styles.dialogContent}>{children}</View>
            {actions && <View style={styles.dialogActions}>{actions}</View>}
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

const makeStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000000',
    },
    dialogContainer: {
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      margin: 16,
      zIndex: 1001,
    },
    dialogCard: {
      backgroundColor: theme.dark ? theme.colors.elevation.level3 : '#FFFFFF',
      borderRadius: 16,
      paddingTop: 20,
      paddingBottom: 16,
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    dialogTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: 16,
    },
    dialogContent: {
      paddingHorizontal: 20,
      gap: 14,
    },
    dialogActions: {
      marginTop: 20,
      paddingHorizontal: 20,
      gap: 8,
    },
  });
