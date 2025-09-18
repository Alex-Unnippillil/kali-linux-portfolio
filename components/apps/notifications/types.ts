export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationMessage {
  id: string;
  message: string;
  date: number;
  critical?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationBundle {
  id: string;
  appId: string;
  deliveredAt: number;
  notifications: NotificationMessage[];
}
