import type { ErrorInfo } from 'react';
import { TelemetryEntry, getTelemetryWindowMs } from './telemetry';

export interface DiagnosticsSnapshot {
  language?: string;
  languages?: string[];
  platform?: string;
  userAgent?: string;
  timezone?: string;
  online?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  viewport?: { width: number; height: number };
  screen?: { width: number; height: number; colorDepth?: number };
  colorScheme?: 'light' | 'dark' | 'no-preference';
  reducedMotion?: boolean;
  cookiesEnabled?: boolean;
}

export interface SerializedError {
  name?: string;
  message?: string;
  stack?: string;
}

export interface SerializedErrorContext {
  error?: SerializedError;
  errorInfo?: { componentStack?: string };
  source?: string;
  note?: string;
}

export interface BugReportDraft {
  description: string;
  route: string;
  userAgent: string;
  diagnostics: DiagnosticsSnapshot;
  logs: TelemetryEntry[];
  telemetryWindowMs?: number;
  context?: SerializedErrorContext;
  now?: number;
}

export interface BugReportPayload {
  createdAt: string;
  description: string;
  route: string;
  userAgent: string;
  diagnostics: DiagnosticsSnapshot;
  telemetryWindowMs: number;
  logs: TelemetryEntry[];
  context?: SerializedErrorContext;
}

export function collectDiagnostics(): DiagnosticsSnapshot {
  if (typeof window === 'undefined') {
    return {};
  }
  const nav = window.navigator;
  const matchMedia = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null;
  const matchColorScheme = matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const matchLightScheme = matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  const matchReducedMotion = matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = undefined;
  }

  let colorScheme: DiagnosticsSnapshot['colorScheme'];
  if (matchColorScheme?.matches) {
    colorScheme = 'dark';
  } else if (matchLightScheme?.matches) {
    colorScheme = 'light';
  } else {
    colorScheme = 'no-preference';
  }

  return {
    language: nav?.language,
    languages: nav?.languages,
    platform: nav?.platform,
    userAgent: nav?.userAgent,
    timezone,
    online: nav?.onLine,
    hardwareConcurrency: nav?.hardwareConcurrency,
    deviceMemory: (nav as any)?.deviceMemory,
    viewport: typeof window.innerWidth === 'number' && typeof window.innerHeight === 'number'
      ? { width: window.innerWidth, height: window.innerHeight }
      : undefined,
    screen: typeof window.screen === 'object'
      ? {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth,
        }
      : undefined,
    colorScheme,
    reducedMotion: Boolean(matchReducedMotion?.matches),
    cookiesEnabled: nav ? nav.cookieEnabled : undefined,
  };
}

export function serializeError(error: unknown): SerializedError | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  if (typeof error === 'object') {
    try {
      return {
        message: JSON.stringify(error),
      };
    } catch {
      return { message: '[unserializable error object]' };
    }
  }
  return { message: String(error) };
}

export function serializeErrorInfo(errorInfo?: ErrorInfo | null): SerializedErrorContext['errorInfo'] {
  if (!errorInfo) return undefined;
  const { componentStack } = errorInfo;
  return componentStack ? { componentStack } : {};
}

export function createBugReportPayload(draft: BugReportDraft): BugReportPayload {
  const telemetryWindowMs = draft.telemetryWindowMs ?? getTelemetryWindowMs();
  const now = draft.now ?? Date.now();
  const cutoff = now - telemetryWindowMs;
  const logs = (draft.logs || []).filter((entry) => entry.timestamp >= cutoff);
  return {
    createdAt: new Date(now).toISOString(),
    description: draft.description,
    route: draft.route,
    userAgent: draft.userAgent,
    diagnostics: draft.diagnostics,
    telemetryWindowMs,
    logs,
    context: draft.context,
  };
}

export function buildErrorContext(options: {
  error?: unknown;
  errorInfo?: ErrorInfo | null;
  source?: string;
  note?: string;
}): SerializedErrorContext | undefined {
  const serializedError = serializeError(options.error);
  const serializedInfo = serializeErrorInfo(options.errorInfo);
  if (!serializedError && !serializedInfo && !options.source && !options.note) {
    return undefined;
  }
  return {
    error: serializedError,
    errorInfo: serializedInfo,
    source: options.source,
    note: options.note,
  };
}
