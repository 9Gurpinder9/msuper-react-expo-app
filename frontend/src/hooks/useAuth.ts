import { useMutation, UseMutationOptions, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from '../services/auth';

export function useLogin(options?: UseMutationOptions<any, Error, { email: string; password: string }>) {
  return useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: ({ email, password }) => authService.login({ email, password }),
    ...options,
  });
}

export function useVerifyOtp(options?: UseMutationOptions<any, Error, { email: string; otp: string }>) {
  return useMutation({
    mutationKey: ['auth', 'verify-otp'],
    mutationFn: ({ email, otp }) => authService.verifyOtp({ email, otp }),
    ...options,
  });
}

