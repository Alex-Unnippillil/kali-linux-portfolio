import type { PushNotificationInput } from '../components/common/NotificationCenter';

type EventMap = Partial<Record<PropertyKey, unknown>>;

export type EventHandler<T> = (payload: T) => void;

export interface TypedEventBus<Events extends EventMap> {
  publish: <Channel extends keyof Events>(channel: Channel, payload: Events[Channel]) => void;
  subscribe: <Channel extends keyof Events>(
    channel: Channel,
    handler: EventHandler<Events[Channel]>,
  ) => () => void;
}

interface CreateEventBusOptions {
  scope?: string;
  trace?: boolean;
  logger?: Pick<Console, 'debug' | 'log'>;
}

const getLogger = (logger?: Pick<Console, 'debug' | 'log'>) => {
  if (!logger) return undefined;
  if (typeof logger.debug === 'function') return (message: string, data: unknown) => logger.debug(message, data);
  if (typeof logger.log === 'function') return (message: string, data: unknown) => logger.log(message, data);
  return undefined;
};

export const createEventBus = <Events extends EventMap>({
  scope = 'event-bus',
  trace = false,
  logger,
}: CreateEventBusOptions = {}): TypedEventBus<Events> => {
  const channels = new Map<keyof Events, Set<EventHandler<any>>>();
  const log = trace ? getLogger(logger ?? console) : undefined;

  const emitLog = (action: string, channel: keyof Events, detail?: unknown) => {
    if (!log) return;
    log(`[${scope}] ${action}: ${String(channel)}`, detail);
  };

  return {
    publish<Channel extends keyof Events>(channel: Channel, payload: Events[Channel]) {
      const subscribers = channels.get(channel) as Set<EventHandler<Events[Channel]>> | undefined;
      if (!subscribers || subscribers.size === 0) return;
      emitLog('publish', channel, payload);
      subscribers.forEach((handler) => {
        handler(payload);
      });
    },
    subscribe<Channel extends keyof Events>(
      channel: Channel,
      handler: EventHandler<Events[Channel]>,
    ) {
      let subscribers = channels.get(channel);
      if (!subscribers) {
        subscribers = new Set();
        channels.set(channel, subscribers);
      }
      subscribers.add(handler as EventHandler<any>);
      emitLog('subscribe', channel);
      return () => {
        const subs = channels.get(channel);
        if (!subs) return;
        subs.delete(handler as EventHandler<any>);
        emitLog('unsubscribe', channel);
        if (subs.size === 0) {
          channels.delete(channel);
        }
      };
    },
  };
};

export enum NotificationEventType {
  Push = 'push',
  Dismiss = 'dismiss',
  Clear = 'clear',
  MarkAllRead = 'mark-all-read',
}

export interface NotificationEventBase<Type extends NotificationEventType, Payload> {
  type: Type;
  payload: Payload;
  timestamp: number;
}

export type NotificationEvent =
  | NotificationEventBase<NotificationEventType.Push, PushNotificationInput>
  | NotificationEventBase<NotificationEventType.Dismiss, { appId: string; id: string }>
  | NotificationEventBase<NotificationEventType.Clear, { appId?: string }>
  | NotificationEventBase<NotificationEventType.MarkAllRead, { appId?: string }>;

export enum WindowLifecycleEventType {
  Opened = 'opened',
  Focused = 'focused',
  Minimized = 'minimized',
  Restored = 'restored',
  Maximized = 'maximized',
  Closed = 'closed',
  Snapped = 'snapped',
  Unsnapped = 'unsnapped',
  PositionChanged = 'position-changed',
}

export type WindowSnapPosition = 'left' | 'right' | 'top' | null;

export interface WindowStateSnapshot {
  width: number;
  height: number;
  maximized: boolean;
  snapped: WindowSnapPosition;
}

export interface WindowStateEvent {
  windowId: string;
  type: WindowLifecycleEventType;
  snapshot: WindowStateSnapshot;
  timestamp: number;
  metadata?: {
    snapPosition?: Exclude<WindowSnapPosition, null>;
    position?: { x: number; y: number };
  };
}

export interface PerformanceMetricsEvent {
  fps: number;
  frameTime: number;
}

export enum SystemEventChannel {
  Notification = 'system:notification',
  WindowState = 'system:window-state',
  PerformanceMetrics = 'system:performance',
}

export interface SystemEventPayloads {
  [SystemEventChannel.Notification]: NotificationEvent;
  [SystemEventChannel.WindowState]: WindowStateEvent;
  [SystemEventChannel.PerformanceMetrics]: PerformanceMetricsEvent;
  [key: string]: unknown;
  [key: number]: unknown;
  [key: symbol]: unknown;
}

const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
const traceFlag =
  isDevelopment &&
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_EVENT_BUS_DEBUG === 'true');

const globalTraceFlag =
  typeof globalThis !== 'undefined' &&
  Boolean((globalThis as Record<string, unknown>).__EVENT_BUS_DEBUG__);

const systemEventBus = createEventBus<SystemEventPayloads>({
  scope: 'system-event-bus',
  trace: Boolean(traceFlag || globalTraceFlag),
  logger: typeof console !== 'undefined' ? console : undefined,
});

if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).__eventBus = systemEventBus;
}

export const publishEvent: TypedEventBus<SystemEventPayloads>['publish'] = (channel, payload) =>
  systemEventBus.publish(channel, payload);

export const subscribeEvent: TypedEventBus<SystemEventPayloads>['subscribe'] = (channel, handler) =>
  systemEventBus.subscribe(channel, handler);

export const publish = publishEvent;
export const subscribe = subscribeEvent;

export default systemEventBus;

