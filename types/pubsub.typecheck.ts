import {
  NotificationEventType,
  publishEvent,
  subscribeEvent,
  SystemEventChannel,
} from '../utils/pubsub';

(() => {
  publishEvent(SystemEventChannel.PerformanceMetrics, { fps: 60, frameTime: 16.6 });
  // @ts-expect-error missing frameTime field
  publishEvent(SystemEventChannel.PerformanceMetrics, { fps: 60 });

  publishEvent(SystemEventChannel.Notification, {
    type: NotificationEventType.Push,
    payload: { appId: 'calculator', title: 'Status update' },
    timestamp: Date.now(),
  });
  // @ts-expect-error payload requires a title field
  publishEvent(SystemEventChannel.Notification, {
    type: NotificationEventType.Push,
    payload: { appId: 'calculator' },
    timestamp: Date.now(),
  });

  const unsubscribeNotification = subscribeEvent(
    SystemEventChannel.Notification,
    event => {
      if (event.type === NotificationEventType.Push) {
        const appId: string = event.payload.appId;
        const title: string = event.payload.title;
        void appId;
        void title;
      }
    },
  );
  unsubscribeNotification();

  const unsubscribeWindow = subscribeEvent(SystemEventChannel.WindowState, event => {
    const maximized: boolean = event.snapshot.maximized;
    const positionX: number | undefined = event.metadata?.position?.x;
    const snap = event.metadata?.snapPosition;
    void maximized;
    void positionX;
    void snap;
    // @ts-expect-error snapshot does not expose an arbitrary property
    event.snapshot.unknown;
  });
  unsubscribeWindow();
})();

export {};
