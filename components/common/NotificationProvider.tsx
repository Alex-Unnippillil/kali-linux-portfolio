import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface NotificationMessage {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface QuickActionContext {
  appId: string;
  thread: NotificationThread;
  dismiss: () => void;
  markRead: () => void;
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  handler?: (context: QuickActionContext) => void | Promise<void>;
}

export interface NotificationThread {
  id: string;
  appId: string;
  title: string;
  collapsed: boolean;
  unreadCount: number;
  lastTimestamp: number;
  notifications: NotificationMessage[];
  actions: QuickAction[];
  meta?: Record<string, unknown>;
}

export type NotificationsByApp = Record<string, NotificationThread[]>;

export interface PushNotificationInput {
  threadId: string;
  title: string;
  message: string;
  timestamp?: number;
  id?: string;
  actions?: QuickAction[];
  meta?: Record<string, unknown>;
  markRead?: boolean;
  collapsed?: boolean;
}

export interface NotificationsContextValue {
  apps: NotificationsByApp;
  perAppUnread: Record<string, number>;
  totalUnread: number;
  pushNotification: (appId: string, payload: PushNotificationInput) => string;
  toggleThreadCollapse: (appId: string, threadId: string) => void;
  markThreadRead: (appId: string, threadId: string) => void;
  runAction: (appId: string, threadId: string, actionId: string) => Promise<void> | void;
  dismissThread: (appId: string, threadId: string) => void;
  clearNotifications: (appId?: string) => void;
}

const ensureDismissAction = (actions: QuickAction[]): QuickAction[] => {
  const withoutDismiss = actions.filter(action => action.id !== 'dismiss');
  const dismiss = actions.find(action => action.id === 'dismiss');
  return [
    ...withoutDismiss,
    dismiss ?? {
      id: 'dismiss',
      label: 'Dismiss',
    },
  ];
};

const mergeActions = (existing: QuickAction[], incoming: QuickAction[]): QuickAction[] => {
  const next: QuickAction[] = [];
  const seen = new Set<string>();

  incoming.forEach(action => {
    if (seen.has(action.id)) return;
    next.push(action);
    seen.add(action.id);
  });

  existing.forEach(action => {
    if (seen.has(action.id)) return;
    next.push(action);
    seen.add(action.id);
  });

  return ensureDismissAction(next);
};

const cloneState = (state: NotificationsByApp): NotificationsByApp =>
  Object.entries(state).reduce<NotificationsByApp>((acc, [appId, threads]) => {
    acc[appId] = threads.map(thread => ({
      ...thread,
      notifications: thread.notifications.map(note => ({ ...note })),
      actions: ensureDismissAction(thread.actions.map(action => ({ ...action }))),
      meta: thread.meta ? { ...thread.meta } : undefined,
    }));
    return acc;
  }, {});

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export interface NotificationProviderProps {
  children?: React.ReactNode;
  initialState?: NotificationsByApp;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  initialState = {},
}) => {
  const [apps, setApps] = useState<NotificationsByApp>(() => cloneState(initialState));
  const appsRef = useRef(apps);

  useEffect(() => {
    appsRef.current = apps;
  }, [apps]);

  const markThreadRead = useCallback((appId: string, threadId: string) => {
    setApps(prev => {
      const threads = prev[appId];
      if (!threads) return prev;
      const index = threads.findIndex(thread => thread.id === threadId);
      if (index === -1) return prev;
      const thread = threads[index];
      if (thread.unreadCount === 0) return prev;
      const updatedThread: NotificationThread = {
        ...thread,
        unreadCount: 0,
        notifications: thread.notifications.map(note => ({ ...note, read: true })),
      };
      const nextThreads = [...threads];
      nextThreads[index] = updatedThread;
      return {
        ...prev,
        [appId]: nextThreads,
      };
    });
  }, []);

  const dismissThread = useCallback((appId: string, threadId: string) => {
    setApps(prev => {
      const threads = prev[appId];
      if (!threads) return prev;
      const nextThreads = threads.filter(thread => thread.id !== threadId);
      if (nextThreads.length === threads.length) return prev;
      const nextState = { ...prev };
      if (nextThreads.length > 0) nextState[appId] = nextThreads;
      else delete nextState[appId];
      return nextState;
    });
  }, []);

  const toggleThreadCollapse = useCallback((appId: string, threadId: string) => {
    setApps(prev => {
      const threads = prev[appId];
      if (!threads) return prev;
      const index = threads.findIndex(thread => thread.id === threadId);
      if (index === -1) return prev;
      const thread = threads[index];
      const collapsed = !thread.collapsed;
      const notifications = collapsed
        ? thread.notifications
        : thread.notifications.map(note => ({ ...note, read: true }));
      const unreadCount = collapsed ? thread.unreadCount : 0;
      const updatedThread: NotificationThread = {
        ...thread,
        collapsed,
        notifications,
        unreadCount,
      };
      const nextThreads = [...threads];
      nextThreads[index] = updatedThread;
      return {
        ...prev,
        [appId]: nextThreads,
      };
    });
  }, []);

  const pushNotification = useCallback(
    (appId: string, payload: PushNotificationInput) => {
      const id = payload.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const timestamp = payload.timestamp ?? Date.now();
      const message: NotificationMessage = {
        id,
        message: payload.message,
        timestamp,
        read: Boolean(payload.markRead),
      };

      setApps(prev => {
        const threads = prev[appId] ?? [];
        const index = threads.findIndex(thread => thread.id === payload.threadId);
        const actions = ensureDismissAction(payload.actions ? [...payload.actions] : []);

        if (index === -1) {
          const newThread: NotificationThread = {
            id: payload.threadId,
            appId,
            title: payload.title,
            collapsed: payload.collapsed ?? false,
            unreadCount: message.read ? 0 : 1,
            lastTimestamp: timestamp,
            notifications: [message],
            actions,
            meta: payload.meta ? { ...payload.meta } : undefined,
          };
          return {
            ...prev,
            [appId]: [...threads, newThread].sort(
              (a, b) => b.lastTimestamp - a.lastTimestamp
            ),
          };
        }

        const thread = threads[index];
        const nextNotifications = [...thread.notifications, message];
        const unreadCount = nextNotifications.reduce(
          (count, note) => count + (note.read ? 0 : 1),
          0
        );
        const updatedThread: NotificationThread = {
          ...thread,
          title: payload.title ?? thread.title,
          collapsed: payload.collapsed ?? thread.collapsed,
          notifications: nextNotifications,
          unreadCount,
          lastTimestamp: Math.max(thread.lastTimestamp, timestamp),
          actions: mergeActions(thread.actions, actions),
          meta: payload.meta ? { ...thread.meta, ...payload.meta } : thread.meta,
        };
        const nextThreads = [...threads];
        nextThreads[index] = updatedThread;
        nextThreads.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        return {
          ...prev,
          [appId]: nextThreads,
        };
      });

      return id;
    },
    []
  );

  const clearNotifications = useCallback((appId?: string) => {
    setApps(prev => {
      if (!appId) return {};
      if (!prev[appId]) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const runAction = useCallback<NotificationsContextValue['runAction']>(
    async (appId, threadId, actionId) => {
      const threads = appsRef.current[appId];
      if (!threads) return;
      const thread = threads.find(item => item.id === threadId);
      if (!thread) return;
      const action = thread.actions.find(item => item.id === actionId);
      if (!action) return;
      const context: QuickActionContext = {
        appId,
        thread,
        dismiss: () => dismissThread(appId, threadId),
        markRead: () => markThreadRead(appId, threadId),
      };
      try {
        if (action.handler) {
          await action.handler(context);
        } else {
          dismissThread(appId, threadId);
        }
      } finally {
        markThreadRead(appId, threadId);
      }
    },
    [dismissThread, markThreadRead]
  );

  const perAppUnread = useMemo(() => {
    return Object.entries(apps).reduce<Record<string, number>>((acc, [appId, threads]) => {
      acc[appId] = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
      return acc;
    }, {});
  }, [apps]);

  const totalUnread = useMemo(
    () => Object.values(perAppUnread).reduce((sum, count) => sum + count, 0),
    [perAppUnread]
  );

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const nav: any = navigator;
    if (totalUnread > 0 && nav?.setAppBadge) {
      nav.setAppBadge(totalUnread).catch(() => {});
    } else if (totalUnread === 0 && nav?.clearAppBadge) {
      nav.clearAppBadge().catch(() => {});
    }
  }, [totalUnread]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      apps,
      perAppUnread,
      totalUnread,
      pushNotification,
      toggleThreadCollapse,
      markThreadRead,
      runAction,
      dismissThread,
      clearNotifications,
    }),
    [apps, perAppUnread, totalUnread, pushNotification, toggleThreadCollapse, markThreadRead, runAction, dismissThread, clearNotifications]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export default NotificationProvider;
