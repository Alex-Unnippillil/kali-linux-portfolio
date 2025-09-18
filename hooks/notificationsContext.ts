import { createContext } from 'react';
import type {
  AppNotification,
  NotificationInput,
  NotificationSummarySnapshot,
} from '../types/notifications';

export interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (input: NotificationInput) => void;
  clearNotifications: (appId?: string) => void;
  doNotDisturb: boolean;
  setDoNotDisturb: (value: boolean) => void;
  summaryInterval: number;
  setSummaryInterval: (value: number) => void;
  summaryWindowStart: number;
  triggerSummary: () => void;
  lastSummarySnapshot: NotificationSummarySnapshot | null;
}

export const NotificationsContext =
  createContext<NotificationsContextValue | null>(null);
