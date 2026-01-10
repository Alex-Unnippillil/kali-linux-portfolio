import type { ErrorInfo } from 'react';

const STORAGE_KEY = 'crash-logs';
const MAX_ENTRIES = 100;
const SCHEMA_VERSION = 1;

export interface CrashLogEntry {
  id: string;
  timestamp: string;
  route: string;
  appId?: string;
  message: string;
  stack?: string;
  componentStack?: string;
  stateHash: string;
}

export interface CrashLogExportPayload {
  meta: {
    schemaVersion: number;
    exportedAt: string;
    entryCount: number;
  };
  entries: CrashLogEntry[];
}

export interface CrashLogRecordInput {
  error: unknown;
  info: ErrorInfo;
  route?: string;
  appId?: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch (jsonError) {
    return String(error);
  }
}

function toErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && typeof error.stack === 'string') {
    return error.stack;
  }

  if (typeof error === 'string') {
    return error;
  }

  return undefined;
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }

  return `h${Math.abs(hash)}`;
}

function safeParse(raw: string | null): CrashLogEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is CrashLogEntry => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.timestamp === 'string' &&
        typeof candidate.route === 'string' &&
        typeof candidate.message === 'string' &&
        typeof candidate.stateHash === 'string'
      );
    });
  } catch (error) {
    console.warn('[crashLog] Failed to parse crash logs from storage', error);
    return [];
  }
}

function persist(entries: CrashLogEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch (error) {
    console.warn('[crashLog] Failed to persist entries', error);
  }
}

function detectRoute(): string {
  if (!isBrowser()) return 'unknown';
  try {
    return window.location.pathname + window.location.search + window.location.hash;
  } catch (error) {
    return 'unknown';
  }
}

function detectAppId(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const selectors = [
    '[data-context="taskbar"][data-active="true"]',
    '[data-app-id][data-focused="true"]',
    '[data-app-id][aria-pressed="true"]',
    '[data-app-id]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      const appId = element.dataset.appId;
      if (appId) return appId;
    }
  }

  return undefined;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `crash-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getCrashLogs(): CrashLogEntry[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

export function clearCrashLogs(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function logCrash({ error, info, route, appId }: CrashLogRecordInput): CrashLogEntry | null {
  if (!isBrowser()) return null;

  const existing = getCrashLogs();
  const detectedRoute = route ?? detectRoute();
  const detectedApp = appId ?? detectAppId();
  const stack = toErrorStack(error) ?? info.componentStack;
  const message = toErrorMessage(error);

  const stateHash = hashString([
    detectedRoute,
    detectedApp ?? '',
    info.componentStack ?? '',
    stack ?? '',
    message
  ].join('|'));

  const entry: CrashLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    route: detectedRoute,
    appId: detectedApp,
    message,
    stack,
    componentStack: info.componentStack,
    stateHash
  };

  persist([...existing, entry]);

  return entry;
}

export function exportCrashLogs(): string {
  const entries = getCrashLogs();
  const payload: CrashLogExportPayload = {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      entryCount: entries.length
    },
    entries
  };

  return JSON.stringify(payload, null, 2);
}

export function importCrashLogs(raw: string): CrashLogEntry[] {
  if (!isBrowser()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('Invalid crash log file: unable to parse JSON');
  }

  let entries: CrashLogEntry[] | null = null;

  if (Array.isArray(parsed)) {
    entries = safeParse(JSON.stringify(parsed));
  } else if (parsed && typeof parsed === 'object' && 'entries' in parsed) {
    const container = parsed as { entries?: unknown };
    if (Array.isArray(container.entries)) {
      entries = safeParse(JSON.stringify(container.entries));
    }
  }

  if (!entries) {
    throw new Error('Invalid crash log file: missing entries');
  }

  persist(entries);
  return entries;
}

export function removeCrashLog(id: string): void {
  if (!isBrowser()) return;
  const filtered = getCrashLogs().filter((entry) => entry.id !== id);
  persist(filtered);
}

