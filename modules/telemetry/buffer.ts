import type { TelemetryChannel, TelemetryPreferences } from './preferences';
import {
  getTelemetryPreferences,
  subscribeToTelemetryPreferences,
} from './preferences';

export interface TelemetryEventRecord {
  channel: TelemetryChannel;
  timestamp: number;
  payload: Record<string, unknown>;
  bytes: number;
}

export interface BufferStats {
  totalEvents: number;
  totalBytes: number;
  byChannel: Record<
    TelemetryChannel,
    {
      events: number;
      bytes: number;
    }
  >;
}

type BufferListener = (stats: BufferStats) => void;

const buffer: TelemetryEventRecord[] = [];
const listeners = new Set<BufferListener>();
let preferences: TelemetryPreferences = getTelemetryPreferences();

subscribeToTelemetryPreferences((prefs) => {
  preferences = prefs;
});

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

const toBytes = (value: unknown): number => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return 0;
  if (encoder) {
    return encoder.encode(text).length;
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text).length;
  }
  return text.length;
};

const sanitizeEvent = (payload: Record<string, unknown>): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === 'string') {
      safe[key] = value.slice(0, 200);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
    } else if (value instanceof Date) {
      safe[key] = value.toISOString();
    } else if (typeof value === 'object') {
      safe[key] = JSON.parse(JSON.stringify(value, (_k, v) => {
        if (v === null || v === undefined) return undefined;
        if (typeof v === 'string') return v.slice(0, 200);
        if (typeof v === 'number' || typeof v === 'boolean') return v;
        return undefined;
      }));
    }
  });
  return safe;
};

const emit = (): void => {
  const snapshot = getBufferStats();
  listeners.forEach((listener) => listener(snapshot));
};

export const enqueueTelemetryEvent = (
  channel: TelemetryChannel,
  payload: Record<string, unknown>,
): boolean => {
  if (!preferences[channel]) {
    return false;
  }
  const sanitized = sanitizeEvent(payload);
  const bytes = toBytes(sanitized);
  buffer.push({ channel, payload: sanitized, timestamp: Date.now(), bytes });
  emit();
  return true;
};

export const getBufferSnapshot = (): TelemetryEventRecord[] => buffer.slice();

export const getBufferStats = (channel?: TelemetryChannel): BufferStats => {
  const base: BufferStats = {
    totalEvents: 0,
    totalBytes: 0,
    byChannel: {
      analytics: { events: 0, bytes: 0 },
      usage: { events: 0, bytes: 0 },
      diagnostics: { events: 0, bytes: 0 },
    },
  };

  buffer.forEach((record) => {
    if (channel && record.channel !== channel) {
      return;
    }
    base.totalEvents += 1;
    base.totalBytes += record.bytes;
    base.byChannel[record.channel].events += 1;
    base.byChannel[record.channel].bytes += record.bytes;
  });

  if (channel) {
    base.totalEvents = base.byChannel[channel].events;
    base.totalBytes = base.byChannel[channel].bytes;
  }

  return base;
};

export const purgeBuffer = (channel?: TelemetryChannel): void => {
  if (!buffer.length) return;
  if (!channel) {
    buffer.splice(0, buffer.length);
  } else {
    for (let i = buffer.length - 1; i >= 0; i -= 1) {
      if (buffer[i].channel === channel) {
        buffer.splice(i, 1);
      }
    }
  }
  emit();
};

export const flushBuffer = (
  dispatcher: (payload: Record<string, unknown>) => void,
  channel?: TelemetryChannel,
): number => {
  const toFlush: TelemetryEventRecord[] = [];
  for (let i = 0; i < buffer.length; i += 1) {
    const record = buffer[i];
    if (channel && record.channel !== channel) continue;
    if (!preferences[record.channel]) continue;
    toFlush.push(record);
  }
  if (!toFlush.length) {
    return 0;
  }
  toFlush.forEach((record) => {
    try {
      dispatcher(record.payload);
    } catch (error) {
      console.warn('Telemetry dispatcher failed', error);
    }
  });
  const flushed = new Set(toFlush);
  for (let i = buffer.length - 1; i >= 0; i -= 1) {
    if (flushed.has(buffer[i])) {
      buffer.splice(i, 1);
    }
  }
  emit();
  return toFlush.length;
};

export const subscribeToTelemetryBuffer = (
  listener: BufferListener,
): (() => void) => {
  listeners.add(listener);
  listener(getBufferStats());
  return () => {
    listeners.delete(listener);
  };
};

export const resetTelemetryBuffer = (): void => {
  purgeBuffer();
};
