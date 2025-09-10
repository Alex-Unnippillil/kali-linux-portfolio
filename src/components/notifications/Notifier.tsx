import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import type { NotificationCorner } from './SettingsDialog';

interface NotifierContextValue {
  notify: (message: string) => void;
}

const NotifierContext = createContext<NotifierContextValue>({ notify: () => {} });

export const useNotifier = () => useContext(NotifierContext);

const cornerClass = (corner: NotificationCorner) => {
  switch (corner) {
    case 'top-left':
      return 'top-2 left-2';
    case 'top-right':
      return 'top-2 right-2';
    case 'bottom-left':
      return 'bottom-2 left-2';
    case 'bottom-right':
    default:
      return 'bottom-2 right-2';
  }
};

export const Notifier: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [timeoutMs] = usePersistentState<number>('notification-timeout', 3000);
  const [corner] = usePersistentState<NotificationCorner>('notification-corner', 'top-right');

  const notify = useCallback((message: string) => {
    setQueue(q => [...q, message]);
  }, []);

  useEffect(() => {
      if (!current && queue.length > 0) {
        setCurrent(queue[0]!);
        setQueue(q => q.slice(1));
      }
  }, [queue, current]);

  useEffect(() => {
    if (current) {
      timerRef.current = setTimeout(() => {
        setCurrent(null);
      }, timeoutMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, timeoutMs]);

  return (
    <NotifierContext.Provider value={{ notify }}>
      {children}
      {current && (
        <div
          className={`fixed z-50 ${cornerClass(corner)}`}
          role="alert"
          aria-live="assertive"
          aria-label="Notification"
        >
          <div className="bg-black text-white px-4 py-2 rounded shadow">{current}</div>
        </div>
      )}
    </NotifierContext.Provider>
  );
};

export default Notifier;
