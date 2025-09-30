const TELEMETRY_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TELEMETRY_CONSOLE === 'true';

type TelemetryLevel = 'info' | 'warn' | 'error';
export type TelemetryEventType = 'toast' | 'error' | 'feature-flag';

interface TelemetryBaseEvent {
  id: string;
  type: TelemetryEventType;
  level: TelemetryLevel;
  timestamp: number;
  message: string;
  source?: string;
  tags?: string[];
  data?: Record<string, unknown>;
}

export interface ToastTelemetryEvent extends TelemetryBaseEvent {
  type: 'toast';
  actionLabel?: string;
}

export interface ErrorTelemetryEvent extends TelemetryBaseEvent {
  type: 'error';
  errorName?: string;
  stack?: string;
  componentStack?: string;
}

export interface FeatureFlagTelemetryEvent extends TelemetryBaseEvent {
  type: 'feature-flag';
  flag: string;
  value: string | number | boolean | null | undefined;
  previousValue?: string | number | boolean | null | undefined;
  origin?: 'env' | 'settings' | 'runtime';
}

export type TelemetryEvent =
  | ToastTelemetryEvent
  | ErrorTelemetryEvent
  | FeatureFlagTelemetryEvent;

type Listener = (events: TelemetryEvent[]) => void;

type LoggableValue = string | number | boolean | null | undefined;

let events: TelemetryEvent[] = [];
const listeners = new Set<Listener>();

const createId = () => `telemetry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const notify = () => {
  if (!TELEMETRY_ENABLED) return;
  listeners.forEach(listener => {
    try {
      listener(events);
    } catch (err) {
      // Ignore listener errors to avoid feedback loops
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Telemetry listener error', err);
      }
    }
  });
};

const pushEvent = <T extends TelemetryEvent>(event: T): T => {
  if (!TELEMETRY_ENABLED) {
    return event;
  }
  events = [event, ...events].slice(0, 500);
  notify();
  return event;
};

export const telemetryStore = {
  enabled: TELEMETRY_ENABLED,
  getEvents(): TelemetryEvent[] {
    return events;
  },
  subscribe(listener: Listener): () => void {
    if (!listeners.has(listener)) {
      listeners.add(listener);
    }
    listener(events);
    return () => {
      listeners.delete(listener);
    };
  },
  clear(predicate?: (event: TelemetryEvent) => boolean) {
    if (!TELEMETRY_ENABLED) return;
    if (!predicate) {
      events = [];
    } else {
      events = events.filter(event => !predicate(event));
    }
    notify();
  },
  remove(id: string) {
    if (!TELEMETRY_ENABLED) return;
    events = events.filter(event => event.id !== id);
    notify();
  },
  logToast(message: string, meta: {
    level?: TelemetryLevel;
    source?: string;
    actionLabel?: string;
    tags?: string[];
    data?: Record<string, unknown>;
  } = {}): ToastTelemetryEvent {
    const { level = 'info', source, actionLabel, tags, data } = meta;
    const entry: ToastTelemetryEvent = {
      id: createId(),
      type: 'toast',
      timestamp: Date.now(),
      message,
      level,
      source,
      actionLabel,
      tags,
      data,
    };
    return pushEvent(entry);
  },
  logError(message: string, meta: {
    error?: unknown;
    componentStack?: string;
    source?: string;
    tags?: string[];
    data?: Record<string, unknown>;
  } = {}): ErrorTelemetryEvent {
    const { error, componentStack, source, tags, data } = meta;
    let errorName: string | undefined;
    let stack: string | undefined;
    if (error instanceof Error) {
      errorName = error.name;
      stack = error.stack;
    } else if (error && typeof error === 'object') {
      errorName = (error as any).name;
      stack = (error as any).stack;
    }
    const entry: ErrorTelemetryEvent = {
      id: createId(),
      type: 'error',
      timestamp: Date.now(),
      message,
      level: 'error',
      source,
      tags,
      data,
      errorName,
      stack,
      componentStack,
    };
    return pushEvent(entry);
  },
  logFeatureFlag(flag: string, value: LoggableValue, meta: {
    previousValue?: LoggableValue;
    origin?: FeatureFlagTelemetryEvent['origin'];
    source?: string;
    tags?: string[];
    data?: Record<string, unknown>;
  } = {}): FeatureFlagTelemetryEvent {
    const { previousValue, origin = 'runtime', source, tags, data } = meta;
    const entry: FeatureFlagTelemetryEvent = {
      id: createId(),
      type: 'feature-flag',
      timestamp: Date.now(),
      message: `Flag ${flag} => ${String(value)}`,
      level: 'info',
      source,
      tags,
      data,
      flag,
      value,
      previousValue,
      origin,
    };
    return pushEvent(entry);
  },
};

export const isTelemetryEnabled = () => TELEMETRY_ENABLED;

