import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  minimized?: boolean;
  snapshot?: unknown;
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
  pendingRestore?: boolean;
  lastUpdated?: number;
  version?: number;
}

const SESSION_VERSION = 2;

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
  pendingRestore: false,
  lastUpdated: 0,
  version: SESSION_VERSION,
};

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const {
    windows,
    dock,
    wallpaper,
    pendingRestore,
    lastUpdated,
  } = value as {
    windows?: unknown;
    dock?: unknown;
    wallpaper?: unknown;
    pendingRestore?: unknown;
    lastUpdated?: unknown;
  };

  const windowsValid =
    windows === undefined || Array.isArray(windows);
  const dockValid = dock === undefined || Array.isArray(dock);
  const wallpaperValid =
    wallpaper === undefined || typeof wallpaper === 'string';
  const pendingRestoreValid =
    pendingRestore === undefined || typeof pendingRestore === 'boolean';
  const lastUpdatedValid =
    lastUpdated === undefined || typeof lastUpdated === 'number';

  return (
    windowsValid &&
    dockValid &&
    wallpaperValid &&
    pendingRestoreValid &&
    lastUpdatedValid
  );
}

const normalizeWindow = (value: unknown): SessionWindow | null => {
  if (!value || typeof value !== 'object') return null;
  const win = value as Partial<SessionWindow> & { id?: unknown; x?: unknown; y?: unknown };
  if (typeof win.id !== 'string' || !win.id) return null;
  const x = typeof win.x === 'number' ? win.x : 60;
  const y = typeof win.y === 'number' ? win.y : 10;
  const minimized = typeof win.minimized === 'boolean' ? win.minimized : false;
  const snapshot = (win as any).snapshot;
  return { id: win.id, x, y, minimized, snapshot };
};

const normalizeSession = (value: DesktopSession): DesktopSession => {
  const windows = Array.isArray((value as any).windows)
    ? (value as any).windows
        .map(normalizeWindow)
        .filter((win): win is SessionWindow => Boolean(win))
    : [];
  const dock = Array.isArray((value as any).dock)
    ? (value as any).dock.filter((id): id is string => typeof id === 'string')
    : [];
  const wallpaper =
    typeof (value as any).wallpaper === 'string'
      ? (value as any).wallpaper
      : defaults.wallpaper;
  const pendingRestore = Boolean((value as any).pendingRestore);
  const lastUpdated =
    typeof (value as any).lastUpdated === 'number'
      ? (value as any).lastUpdated
      : Date.now();

  return {
    windows,
    dock,
    wallpaper,
    pendingRestore,
    lastUpdated,
    version: SESSION_VERSION,
  };
};

export { SESSION_VERSION, initialSession };

export default function useSession() {
  const [stored, setStored, _reset, clear] = usePersistentState<DesktopSession>(
    'desktop-session',
    initialSession,
    isSession,
  );

  const session = normalizeSession(stored);

  const updateSession = (next: DesktopSession) => {
    setStored(normalizeSession(next));
  };

  const resetSession = () => {
    clear();
  };

  return { session, setSession: updateSession, resetSession };
}
