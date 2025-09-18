import ReactGA from 'react-ga4';
import type { TelemetryChannel } from '../modules/telemetry/preferences';
import {
  enqueueTelemetryEvent,
  flushBuffer,
  getBufferStats,
  purgeBuffer,
} from '../modules/telemetry/buffer';

type EventInput = Parameters<typeof ReactGA.event>[0];

const ANALYTICS_CHANNEL: TelemetryChannel = 'analytics';

const shouldDispatch = (): boolean =>
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

const safeEvent = (...args: Parameters<typeof ReactGA.event>): void => {
  try {
    const eventFn = ReactGA.event;
    if (typeof eventFn === 'function') {
      eventFn(...args);
    }
  } catch {
    // Ignore analytics errors
  }
};

const normalizeEvent = (event: EventInput): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  Object.entries(event as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      payload[key] = value;
    }
  });
  if (!payload.category) {
    payload.category = 'uncategorized';
  }
  if (!payload.action) {
    payload.action = 'event';
  }
  return payload;
};

export const logEvent = (event: EventInput): boolean => {
  const normalized = normalizeEvent(event);
  return enqueueTelemetryEvent(ANALYTICS_CHANNEL, normalized);
};

export const flushAnalyticsEvents = (): number => {
  if (!shouldDispatch()) {
    purgeBuffer(ANALYTICS_CHANNEL);
    return 0;
  }
  return flushBuffer((payload) => safeEvent(payload as EventInput), ANALYTICS_CHANNEL);
};

export const purgeAnalyticsBuffer = (): void => {
  purgeBuffer(ANALYTICS_CHANNEL);
};

export const getAnalyticsBufferStats = () => getBufferStats(ANALYTICS_CHANNEL);

export const logGameStart = (game: string): void => {
  logEvent({ category: game, action: 'start' });
};

export const logGameEnd = (game: string, label?: string): void => {
  logEvent({ category: game, action: 'end', label });
};

export const logGameError = (game: string, message?: string): void => {
  logEvent({ category: game, action: 'error', label: message });
};
