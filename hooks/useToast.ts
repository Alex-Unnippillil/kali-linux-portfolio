import { useContext } from 'react';
import { ToastContext, toast as externalToast, ToastFn } from '../components/notifications/ToastProvider';

export const useToast = (): ToastFn => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx.toast;
};

export const toast: ToastFn = externalToast;

export default useToast;
