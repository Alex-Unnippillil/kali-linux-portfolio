import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  snap?: 'left' | 'right' | 'top' | null;
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
}

export type WindowAction =
  | { type: 'add'; window: SessionWindow }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; updates: Partial<SessionWindow> };

export function applyWindowAction(
  windows: SessionWindow[],
  action: WindowAction,
): SessionWindow[] {
  switch (action.type) {
    case 'add':
      return [...windows, action.window];
    case 'remove':
      return windows.filter((w) => w.id !== action.id);
    case 'update':
      return windows.map((w) =>
        w.id === action.id ? { ...w, ...action.updates } : w,
      );
  }
}

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
};

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as DesktopSession;
  return (
    Array.isArray(s.windows) &&
    s.windows.every(
      (w) =>
        w &&
        typeof w.id === 'string' &&
        typeof w.x === 'number' &&
        typeof w.y === 'number' &&
        (w.snap === undefined ||
          w.snap === null ||
          w.snap === 'left' ||
          w.snap === 'right' ||
          w.snap === 'top'),
    ) &&
    typeof s.wallpaper === 'string' &&
    Array.isArray(s.dock)
  );
}

export default function useSession() {
  const [session, setSession, _reset, clear] = usePersistentState<DesktopSession>(
    'desktop-session',
    initialSession,
    isSession,
  );

  const resetSession = () => {
    clear();
  };

  const dispatch = (action: WindowAction) =>
    setSession((s) => ({
      ...s,
      windows: applyWindowAction(s.windows, action),
    }));

  return { session, setSession, resetSession, dispatch };
}
