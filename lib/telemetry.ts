export type TelemetryLevel = 'info' | 'warn' | 'error' | 'debug' | string;

export interface TelemetryEntry {
  timestamp: number;
  level: TelemetryLevel;
  message: string;
  meta?: Record<string, any>;
}

const TELEMETRY_WINDOW_MS = 60_000;
const GLOBAL_KEY = '__KALI_TELEMETRY_BUFFER__';

interface TelemetryState {
  entries: TelemetryEntry[];
}

function getGlobalRoot(): any | null {
  if (typeof window !== 'undefined') {
    return window as any;
  }
  return null;
}

function getState(): TelemetryState | null {
  const root = getGlobalRoot();
  if (!root) return null;
  if (!root[GLOBAL_KEY]) {
    root[GLOBAL_KEY] = { entries: [] } as TelemetryState;
  }
  return root[GLOBAL_KEY] as TelemetryState;
}

function prune(state: TelemetryState, now: number) {
  state.entries = state.entries.filter((entry) => now - entry.timestamp <= TELEMETRY_WINDOW_MS);
}

export function recordTelemetry(entry: TelemetryEntry) {
  const state = getState();
  if (!state) return;
  prune(state, entry.timestamp);
  state.entries.push(entry);
}

export function getTelemetryEntries(windowMs: number = TELEMETRY_WINDOW_MS): TelemetryEntry[] {
  const state = getState();
  if (!state) return [];
  const now = Date.now();
  prune(state, now);
  const threshold = now - windowMs;
  return state.entries
    .filter((entry) => entry.timestamp >= threshold)
    .map((entry) => ({ ...entry }));
}

export interface TelemetryExport {
  generatedAt: string;
  windowMs: number;
  entries: TelemetryEntry[];
}

export function exportTelemetry(windowMs: number = TELEMETRY_WINDOW_MS): TelemetryExport {
  const now = Date.now();
  const entries = getTelemetryEntries(windowMs);
  return {
    generatedAt: new Date(now).toISOString(),
    windowMs,
    entries,
  };
}

export function exportTelemetryJson(windowMs: number = TELEMETRY_WINDOW_MS): string {
  const payload = exportTelemetry(windowMs);
  return JSON.stringify(payload, null, 2);
}

export function getTelemetryWindowMs() {
  return TELEMETRY_WINDOW_MS;
}

export function __dangerousResetTelemetry() {
  const state = getState();
  if (state) {
    state.entries = [];
  }
}
