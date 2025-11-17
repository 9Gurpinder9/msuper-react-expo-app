import { useContext } from 'react';
import { ToastContext } from './ToastProvider';

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  const { showToast } = ctx;
  return {
    showToast,
    showSuccess: (message: string, durationMs?: number) => showToast(message, 'success', durationMs),
    showError: (message: string, durationMs?: number) => showToast(message, 'error', durationMs),
    showWarning: (message: string, durationMs?: number) => showToast(message, 'warning', durationMs),
    showInfo: (message: string, durationMs?: number) => showToast(message, 'info', durationMs),
  };
};
