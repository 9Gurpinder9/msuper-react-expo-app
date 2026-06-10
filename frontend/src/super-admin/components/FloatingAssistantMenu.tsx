import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  PanResponder,
  Animated,
  useWindowDimensions,
  View,
  Platform,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDrawer } from '../context/DrawerContext';

export default function FloatingAssistantMenu() {
  const theme = useTheme();
  const { toggleDrawer } = useDrawer();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Floating button dimensions
  const BUTTON_SIZE = 50;
  const MARGIN = 16;

  // Track if hovering on web
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Initial position: Bottom right (above standard FAB positions)
  const pan = useRef(
    new Animated.ValueXY({
      x: screenWidth - BUTTON_SIZE - MARGIN,
      y: screenHeight - BUTTON_SIZE - 120,
    })
  ).current;

  // Store drag state to distinguish taps from drags
  const dragStart = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only take control if there is actual movement to avoid stealing taps
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: (e, gestureState) => {
        setIsPressed(true);
        // Record starting position
        dragStart.current = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        };
        // Set offset so moving is relative to current location
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        setIsPressed(false);
        // Flatten the offset into value
        pan.flattenOffset();

        // Calculate absolute gesture distance to detect static tap
        const dist = Math.sqrt(
          gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy
        );

        if (dist < 6) {
          // It's a tap
          toggleDrawer();
          return;
        }

        // Snap to nearest horizontal edge (left or right)
        const currentX = (pan.x as any)._value;
        const middle = screenWidth / 2;
        let targetX = MARGIN;

        if (currentX + BUTTON_SIZE / 2 > middle) {
          targetX = screenWidth - BUTTON_SIZE - MARGIN;
        }

        // Keep vertical bounds within screen
        const currentY = (pan.y as any)._value;
        const minY = MARGIN + 40; // Avoid header
        const maxY = screenHeight - BUTTON_SIZE - MARGIN - 40; // Avoid footer
        const targetY = Math.max(minY, Math.min(maxY, currentY));

        Animated.parallel([
          Animated.spring(pan.x, {
            toValue: targetX,
            useNativeDriver: false,
            damping: 15,
            stiffness: 120,
          }),
          Animated.spring(pan.y, {
            toValue: targetY,
            useNativeDriver: false,
            damping: 15,
            stiffness: 120,
          }),
        ]).start();
      },
    })
  ).current;

  // Calculate dynamic style properties
  const isDark = theme.dark;
  const idleOpacity = Platform.OS === 'web' ? (isHovered ? 1.0 : 0.45) : (isPressed ? 1.0 : 0.55);

  const containerStyle = [
    styles.container,
    {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
      opacity: idleOpacity,
      transform: [
        { translateX: pan.x },
        { translateY: pan.y },
        { scale: isPressed ? 0.92 : isHovered ? 1.06 : 1.0 },
      ],
    },
  ];

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={containerStyle}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <View
        style={styles.innerPress}
        accessibilityLabel="Open sidebar navigation menu shortcut"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name="apps"
          size={24}
          color={theme.colors.primary}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 9999,
    elevation: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      web: {
        cursor: 'grab',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        transition: 'opacity 0.2s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      } as any,
    }),
  },
  innerPress: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
  },
});
