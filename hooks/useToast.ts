import { useContext } from 'react';
import {
  ToastContext,
  ToastContextValue,
  ToastOptions,
} from '../components/ui/ToastProvider';

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

export type { ToastOptions };

export default useToast;
