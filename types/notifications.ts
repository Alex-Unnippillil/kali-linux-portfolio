export const NOTIFICATION_REPEAT_WINDOW_MS = 5000;

export interface NotificationInput {
  appId: string;
  subject: string;
  body: string;
  isCritical?: boolean;
  date?: number;
}

export interface AppNotification {
  id: string;
  appId: string;
  subject: string;
  body: string;
  date: number;
  isCritical: boolean;
}

export interface NotificationOccurrence {
  id: string;
  body: string;
  date: number;
  repeatCount: number;
  isCritical: boolean;
}

export interface NotificationGroup {
  appId: string;
  subject: string;
  totalCount: number;
  lastDate: number;
  lastBody: string;
  occurrences: NotificationOccurrence[];
  isCritical: boolean;
}

export interface NotificationSummaryStats {
  rawCount: number;
  cardCount: number;
  clusterCount: number;
}

export interface NotificationSummarySnapshot {
  windowStart: number;
  windowEnd: number;
  stats: NotificationSummaryStats;
}
