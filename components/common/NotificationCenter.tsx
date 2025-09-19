import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Toast from '../ui/Toast';
import {
  useSettings,
  NotificationPreference,
} from '../../hooks/useSettings';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (appId: string, message: string) => void;
  clearNotifications: (appId?: string) => void;
  preferences: Record<string, NotificationPreference>;
  getPreference: (appId: string) => NotificationPreference;
  updatePreference: (
    appId: string,
    updates: Partial<NotificationPreference>,
  ) => void;
  resetPreference: (appId?: string) => void;
  setPreferences: (
    prefs: Record<string, Partial<NotificationPreference>>,
  ) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

interface BannerNotification extends AppNotification {
  appId: string;
}

let audioContext: AudioContext | null = null;

const ensureAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      audioContext = null;
    }
  }
  return audioContext;
};

const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  } catch {
    // ignore resume failures caused by autoplay policies
  }
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  oscillator.start(now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  oscillator.stop(now + 0.3);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
};

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const {
    notificationPreferences,
    getNotificationPreference,
    updateNotificationPreference,
    resetNotificationPreference,
    setNotificationPreferences,
  } = useSettings();
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const [bannerQueue, setBannerQueue] = useState<BannerNotification[]>([]);
  const [activeBanner, setActiveBanner] = useState<BannerNotification | null>(null);

  const pushNotification = useCallback((appId: string, message: string) => {
    const entry: AppNotification = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      date: Date.now(),
    };
    setNotifications(prev => {
      const list = prev[appId] ?? [];
      return {
        ...prev,
        [appId]: [...list, entry],
      };
    });
    const preference = getNotificationPreference(appId);
    if (preference.banners) {
      setBannerQueue(queue => [...queue, { ...entry, appId }]);
    }
    if (preference.sounds) {
      playNotificationSound();
    }
  }, [getNotificationPreference]);

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications(prev => {
      if (!appId) return {};
      if (!(appId in prev)) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    if (!appId) {
      setBannerQueue([]);
      setActiveBanner(null);
      return;
    }
    setBannerQueue(queue => queue.filter(item => item.appId !== appId));
    setActiveBanner(current => (current?.appId === appId ? null : current));
  }, []);

  useEffect(() => {
    setBannerQueue(queue =>
      queue.filter(item => getNotificationPreference(item.appId).banners),
    );
    setActiveBanner(current => {
      if (!current) return current;
      return getNotificationPreference(current.appId).banners ? current : null;
    });
  }, [getNotificationPreference]);

  useEffect(() => {
    if (!activeBanner && bannerQueue.length > 0) {
      setActiveBanner(bannerQueue[0]);
      setBannerQueue(queue => queue.slice(1));
    }
  }, [activeBanner, bannerQueue]);

  const handleBannerClose = useCallback(() => {
    setActiveBanner(null);
  }, []);

  const totalCount = useMemo(
    () =>
      Object.entries(notifications).reduce((sum, [appId, list]) => {
        const prefs = getNotificationPreference(appId);
        return prefs.badges ? sum + list.length : sum;
      }, 0),
    [notifications, getNotificationPreference],
  );

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        pushNotification,
        clearNotifications,
        preferences: notificationPreferences,
        getPreference: getNotificationPreference,
        updatePreference: updateNotificationPreference,
        resetPreference: resetNotificationPreference,
        setPreferences: setNotificationPreferences,
      }}
    >
      {children}
      {activeBanner && (
        <Toast
          key={activeBanner.id}
          message={`${activeBanner.appId}: ${activeBanner.message}`}
          onClose={handleBannerClose}
        />
      )}
      <div className="notification-center">
        {Object.keys(notifications).length === 0 ? (
          <p className="notification-empty">No notifications</p>
        ) : (
          Object.entries(notifications).map(([appId, list]) => (
            <section key={appId} className="notification-group">
              <h3>{appId}</h3>
              <ul>
                {list.map(n => (
                  <li key={n.id}>{n.message}</li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
