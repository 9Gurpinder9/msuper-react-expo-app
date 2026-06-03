import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type AppLoaderProps = {
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  transparent?: boolean;
};

export default function AppLoader({ message = 'Authenticating...', icon = 'shield-lock-outline', transparent = false }: AppLoaderProps) {
  const theme = useTheme();

  // Animation values
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // 1. Spinning loop for loading arc
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 2. Breathing pulse loop for glow ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Text breathing opacity loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.4,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotation, pulse, textOpacity]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: transparent ? 'transparent' : theme.colors.background }]}>
      <View style={styles.badgeContainer}>
        {/* Breathing Glow Ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              borderColor: theme.colors.primary,
              transform: [{ scale: pulse }],
            },
          ]}
        />

        {/* Spinning Arc */}
        <Animated.View
          style={[
            styles.spinnerArc,
            {
              borderTopColor: theme.colors.secondary,
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* Secure Center Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.dark ? theme.colors.elevation.level3 : '#F1F5F9' },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={30}
            color={theme.colors.primary}
          />
        </View>
      </View>

      {/* Pulsing Status Text */}
      <Animated.Text
        style={[
          styles.messageText,
          {
            color: theme.colors.onSurfaceVariant,
            opacity: textOpacity,
          },
        ]}
      >
        {message}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    opacity: 0.15,
  },
  spinnerArc: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 24,
    letterSpacing: 0.8,
  },
});
