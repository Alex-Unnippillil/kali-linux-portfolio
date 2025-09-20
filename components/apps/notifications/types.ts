export interface NotificationAction {
  id: string;
  label: string;
  handler: () => void;
}

export interface SummaryBundle {
  id: string;
  appId: string;
  count: number;
  messages: string[];
  releasedAt: number;
  actions: NotificationAction[];
}
