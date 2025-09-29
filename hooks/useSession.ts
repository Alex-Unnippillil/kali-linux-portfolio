import { useCallback, useMemo } from 'react';
import type { SetStateAction } from 'react';
import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export type SnapPosition = 'left' | 'right' | 'top' | null;

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  workspace: number;
  minimized: boolean;
  maximized: boolean;
  snapped: SnapPosition;
  order: number;
  context?: Record<string, unknown>;
}

export interface DesktopSession {
  version: number;
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
}

export const SESSION_VERSION = 2;

const STORAGE_KEY = 'desktop-session';

const DEFAULT_WINDOW_WIDTH = 60;
const DEFAULT_WINDOW_HEIGHT = 85;
const DEFAULT_WORKSPACE = 0;

const initialSession: DesktopSession = {
  version: SESSION_VERSION,
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidContext = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isPersistedSession = (value: unknown): value is Partial<DesktopSession> => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<DesktopSession>;
  return Array.isArray(session.windows);
};

export function sanitizeSessionWindow(value: unknown, fallbackOrder = 0): SessionWindow | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const windowValue = value as Partial<SessionWindow> & { id?: unknown };
  if (typeof windowValue.id !== 'string' || windowValue.id.trim().length === 0) {
    return null;
  }

  const x = isFiniteNumber(windowValue.x) ? windowValue.x : 60;
  const y = isFiniteNumber(windowValue.y) ? windowValue.y : 60;
  const width = isFiniteNumber(windowValue.width)
    ? windowValue.width
    : DEFAULT_WINDOW_WIDTH;
  const height = isFiniteNumber(windowValue.height)
    ? windowValue.height
    : DEFAULT_WINDOW_HEIGHT;
  const workspace = isFiniteNumber(windowValue.workspace)
    ? Math.max(0, Math.floor(windowValue.workspace))
    : DEFAULT_WORKSPACE;
  const minimized = typeof windowValue.minimized === 'boolean'
    ? windowValue.minimized
    : false;
  const maximized = typeof windowValue.maximized === 'boolean'
    ? windowValue.maximized
    : false;
  const snapped =
    windowValue.snapped === 'left' ||
    windowValue.snapped === 'right' ||
    windowValue.snapped === 'top'
      ? windowValue.snapped
      : null;
  const order = isFiniteNumber(windowValue.order)
    ? windowValue.order
    : fallbackOrder;

  const context = isValidContext(windowValue.context)
    ? { ...windowValue.context }
    : undefined;

  return {
    id: windowValue.id,
    x,
    y,
    width,
    height,
    workspace,
    minimized,
    maximized,
    snapped,
    order,
    context,
  };
}

export function sanitizeDesktopSession(value: unknown): DesktopSession {
  if (!isPersistedSession(value)) {
    return { ...initialSession };
  }

  const raw = value as Partial<DesktopSession>;
  const windows = Array.isArray(raw.windows)
    ? raw.windows
        .map((windowValue, index) => sanitizeSessionWindow(windowValue, index))
        .filter((windowValue): windowValue is SessionWindow => windowValue !== null)
        .sort((a, b) => a.order - b.order)
    : [];

  windows.forEach((windowValue, index) => {
    windowValue.order = index;
  });

  const wallpaper = typeof raw.wallpaper === 'string'
    ? raw.wallpaper
    : defaults.wallpaper;

  const dock = Array.isArray(raw.dock)
    ? raw.dock.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    version: SESSION_VERSION,
    windows,
    wallpaper,
    dock,
  };
}

export default function useSession() {
  const [rawSession, setRawSession, _reset, clear] = usePersistentState<DesktopSession>(
    STORAGE_KEY,
    initialSession,
    isPersistedSession,
  );

  const session = useMemo(() => sanitizeDesktopSession(rawSession), [rawSession]);

  const setSession = useCallback(
    (value: SetStateAction<DesktopSession>) => {
      setRawSession((prev) => {
        const base = sanitizeDesktopSession(prev);
        const next = typeof value === 'function' ? value(base) : value;
        const sanitized = sanitizeDesktopSession(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        } catch {
          // ignore storage errors
        }
        return sanitized;
      });
    },
    [setRawSession],
  );

  const resetSession = useCallback(() => {
    clear();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [clear]);

  return { session, setSession, resetSession };
}
