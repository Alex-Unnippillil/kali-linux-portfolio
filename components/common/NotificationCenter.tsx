import NotificationsProvider, {
  NotificationsContext,
  type AppNotification,
  type IndicatorState,
  type NotificationsContextValue,
} from '../system/Notifications';

export type { AppNotification, IndicatorState, NotificationsContextValue };
export { NotificationsContext };

export const NotificationCenter = NotificationsProvider;

export default NotificationsProvider;
