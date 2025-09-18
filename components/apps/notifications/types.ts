export interface NotificationAction {
  id: string;
  label: string;
  onSelect: () => void;
}

export interface SummaryBundle {
  id: string;
  appId: string;
  appTitle: string;
  count: number;
  deliveredAt: number;
  latestMessage: string;
  actions: NotificationAction[];
}
