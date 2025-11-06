import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login from './login';

jest.mock('@utils/network', () => ({
  fetchJson: jest.fn().mockResolvedValue({ ok: true, status: 200, data: { message: 'OTP sent' }, raw: '', headers: {} as any }),
}));

describe('Login (Super Admin)', () => {
  const renderWithProviders = () => render(
    <SafeAreaProvider>
      <Login />
    </SafeAreaProvider>
  );

  beforeEach(() => {
    const { __mockRouter } = require('expo-router');
    const { __mockToast } = require('@utils/toast');
    __mockRouter.replace.mockReset();
    __mockRouter.push.mockReset();
    __mockRouter.back.mockReset();
    __mockToast.showToast.mockReset();
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.setItem.mockReset();
    const net = require('@utils/network');
    net.fetchJson.mockClear();
    net.fetchJson.mockResolvedValue({ ok: true, status: 200, data: { message: 'OTP sent' }, raw: '', headers: {} });
  });

  it('renders both inputs', () => {
    const { getByLabelText } = renderWithProviders();
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
  });

  it('disables submit button when inputs are empty', () => {
    const { getByLabelText } = renderWithProviders();
    const button = getByLabelText('Log in');
    expect(button).toBeDisabled();
  });

  it('submits when both fields filled (calls API)', async () => {
    const { getByLabelText } = renderWithProviders();
    const email = getByLabelText('Email');
    const pwd = getByLabelText('Password');

    fireEvent.changeText(email, 'admin@example.com');
    fireEvent.changeText(pwd, 'secret');
    await new Promise((r) => setTimeout(r, 0));

    const button = getByLabelText('Log in');
    fireEvent.press(button);

    const { fetchJson } = require('@utils/network');
    const { __mockRouter } = require('expo-router');
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { __mockToast } = require('@utils/toast');

    await waitFor(() => expect(fetchJson).toHaveBeenCalled());
    expect(fetchJson).toHaveBeenCalledWith(
      expect.stringMatching(/\/super-admin\/login$/),
      expect.objectContaining({ method: 'POST' })
    );
    expect(__mockRouter.replace).toHaveBeenCalledWith('/super-admin/otp-verify');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('loginEmail', 'admin@example.com');
    expect(__mockToast.showToast).toHaveBeenCalled();
  });

  it('shows invalid email message when email format is wrong', async () => {
    const { getByLabelText, findByLabelText } = renderWithProviders();
    const email = getByLabelText('Email');
    const pwd = getByLabelText('Password');

    fireEvent.changeText(email, 'invalid-email');
    fireEvent.changeText(pwd, 'secret');

    const button = getByLabelText('Log in');
    fireEvent.press(button);

    expect(await findByLabelText('Enter a valid email')).toBeTruthy();
  });

  it('renders backend error message on failed login', async () => {
    const net = require('@utils/network');
    net.fetchJson.mockResolvedValue({ ok: false, status: 401, data: { message: 'Invalid credentials' }, raw: '', headers: {} });

    const { getByLabelText, findByLabelText } = renderWithProviders();
    const email = getByLabelText('Email');
    const pwd = getByLabelText('Password');

    fireEvent.changeText(email, 'admin@example.com');
    fireEvent.changeText(pwd, 'wrong');

    const button = getByLabelText('Log in');
    fireEvent.press(button);

    expect(await findByLabelText('Invalid credentials')).toBeTruthy();
  });
});
