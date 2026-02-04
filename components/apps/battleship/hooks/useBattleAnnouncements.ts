import { useCallback, useEffect, useRef, useState } from 'react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

type Toast = {
  type: ToastType;
  title: string;
  message: string;
};

const defaultTitles: Record<ToastType, string> = {
  info: 'Command Update',
  success: 'Victory Report',
  warning: 'Tactical Advisory',
  error: 'Critical Alert',
};

export const useBattleAnnouncements = () => {
  const [toast, setToast] = useState<Toast | null>(null);
  const [message, setMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setToast(null);
    if (timerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const announce = useCallback(
    (type: ToastType, body: string, title?: string) => {
      setToast({
        type,
        title: title ?? defaultTitles[type],
        message: body,
      });
      setMessage(body);
      if (typeof window !== 'undefined') {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => {
          setToast(null);
          timerRef.current = null;
        }, 4500);
      }
    },
    [],
  );

  useEffect(() => () => dismiss(), [dismiss]);

  return {
    toast,
    message,
    announce,
    dismiss,
  };
};
