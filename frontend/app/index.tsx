// frontend/app/index.tsx
import React from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '../src/theme/types';

type EntryCard = {
  key: 'super-admin' | 'company';
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
};

const ENTRY_CARDS: EntryCard[] = [
  {
    key: 'super-admin',
    title: 'Super Admin',
    description: 'Manage system-level access, audit trails, and global settings.',
    icon: 'shield-star-outline',
    route: '/super-admin/login',
  },
  {
    key: 'company',
    title: 'Company',
    description: 'Open the company workspace and access bookmarks and tools.',
    icon: 'office-building-outline',
    route: '/company/dashboard',
  },
];

export default function Index() {
  const theme = useTheme<AppTheme>();
  const reveal = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  const backgroundGradient: [string, string, string] = [
    theme.colors.background,
    theme.colors.surfaceVariant,
    theme.colors.surface,
  ];

  return (
    <LinearGradient colors={backgroundGradient} style={styles.page}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.hero,
              {
                opacity: reveal,
                transform: [
                  {
                    translateY: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Choose Workspace
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
              One hub. Two powerful entry points.
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Select where you want to go. You can always switch later.
            </Text>
          </Animated.View>

          <View style={styles.cardGrid}>
            {ENTRY_CARDS.map((card, index) => (
              <EntryCardView
                key={card.key}
                card={card}
                index={index}
                reveal={reveal}
                onPress={() => router.push(card.route)}
                theme={theme}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type CardViewProps = {
  card: EntryCard;
  index: number;
  reveal: Animated.Value;
  onPress: () => void;
  theme: AppTheme;
};

function EntryCardView({ card, index, reveal, onPress, theme }: CardViewProps) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const lift = React.useRef(new Animated.Value(0)).current;
  const isDark = theme.dark;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }),
      Animated.spring(lift, { toValue: -2, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const cardGradient: [string, string] = card.key === 'super-admin'
    ? [theme.colors.primaryContainer, theme.colors.surface]
    : [theme.colors.secondaryContainer, theme.colors.surface];

  const cardTextColor = card.key === 'super-admin'
    ? theme.colors.onPrimaryContainer
    : theme.colors.onSecondaryContainer;

  const cardDescriptionColor = cardTextColor;

  const iconShellColor = card.key === 'super-admin'
    ? theme.colors.primary
    : theme.colors.secondary;

  const iconShellBackground = theme.colors.background;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: reveal.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [20 + index * 6, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={{ transform: [{ scale }, { translateY: lift }] }}>
          <LinearGradient
            colors={cardGradient}
            style={[
              styles.card,
              {
                shadowColor: theme.colors.shadow,
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                shadowOpacity: isDark ? 0.34 : 0.18,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: iconShellBackground },
                ]}
              >
                <MaterialCommunityIcons name={card.icon} size={26} color={iconShellColor} />
              </View>
              <Text style={[styles.cardTitle, { color: cardTextColor }]}>
                {card.title}
              </Text>
            </View>
            <Text
              style={[
                styles.cardDescription,
                { color: cardDescriptionColor, opacity: isDark ? 1 : 0.78 },
              ]}
            >
              {card.description}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardAction, { color: cardTextColor }]}>
                Enter workspace
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={cardTextColor} />
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
const headingFont = 'Inter_600SemiBold';
const bodyFont = 'Inter_400Regular';

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
  },
  hero: {
    marginBottom: 32,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: bodyFont,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: headingFont,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: bodyFont,
    maxWidth: 520,
  },
  cardGrid: {
    gap: 18,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'visible',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0c1424',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: headingFont,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: bodyFont,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardAction: {
    fontSize: 14,
    fontFamily: bodyFont,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
