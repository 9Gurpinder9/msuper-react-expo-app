import '@testing-library/jest-native/extend-expect';
import React from 'react';

(global as any).__DEV__ = false;

// Reduce noisy console output from dependencies during tests
const originalError = console.error;
console.error = (...args: any[]) => {
  const msg = String(args?.[0] ?? '');
  if (msg.includes('react-test-renderer is deprecated')) return;
  originalError(...args);
};
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = String(args?.[0] ?? '');
  if (msg.includes('"shadow*" style props are deprecated')) return;
  originalWarn(...args);
};

// Mock react-native-paper using React Native primitives so RTL can interact
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TextInput: RNTextInput } = require('react-native');

  const Card: any = (props: any) => React.createElement(View, props, props.children);
  Card.Content = (props: any) => React.createElement(View, props, props.children);
  Card.Title = (props: any) => React.createElement(View, props, props.children);

  const TextInput: any = ({ label, testID, value, onChangeText, ...rest }: any) =>
    React.createElement(RNTextInput, {
      accessibilityLabel: label,
      testID: testID || label,
      value,
      onChangeText,
      ...rest,
    });
  TextInput.Icon = (_props: any) => React.createElement(View);

  const Button: any = ({ children, onPress, disabled, testID, accessibilityLabel, ...rest }: any) =>
    React.createElement(View, { testID: testID || 'Button', onPress, disabled, accessibilityLabel: accessibilityLabel || (typeof children === 'string' ? children : undefined), ...rest },
      typeof children === 'string' ? React.createElement(Text, null, children) : children
    );

  const HelperText: any = (props: any) => {
    const label = typeof props.children === 'string' ? props.children : undefined;
    return React.createElement(Text, { accessibilityLabel: label, ...props }, props.children);
  };
  const ProgressBar: any = (props: any) => React.createElement(View, props);
  const Portal: any = ({ children }: any) => React.createElement(React.Fragment, null, children);
  const useTheme = () => ({
    colors: {
      primary: '#6200ee',
      onPrimary: '#ffffff',
      surface: '#ffffff',
      surfaceVariant: '#f2f2f2',
      onSurface: '#000000',
    },
  });

  return { __esModule: true, Card, TextInput, Button, HelperText, useTheme, ProgressBar, Portal };
});

// Mock expo-router navigation
jest.mock('expo-router', () => {
  const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
  return { useRouter: () => mockRouter, __mockRouter: mockRouter };
});

// Mock vector icons (render as simple text element)
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const Icon = (props: any) => React.createElement('Icon', props);
  Icon.displayName = 'MaterialCommunityIcons';
  return Icon;
});

// Mock toast
jest.mock('@utils/toast', () => {
  const showToast = jest.fn();
  return { useToast: () => ({ showToast }), __mockToast: { showToast } };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-constants for config
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        appVariant: 'super-admin',
        API_BASE_URL: 'http://localhost:4000',
      },
    },
  },
}));

// Mock Super Admin TopAppBar to avoid paper Appbar/Menu complexity
jest.mock('@super-admin/components/TopAppBar', () => () => null);
