import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  groupId?: string;
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
}

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
};

const isSessionWindow = (value: unknown): value is SessionWindow => {
  if (!value || typeof value !== 'object') return false;
  const w = value as SessionWindow;
  return (
    typeof w.id === 'string' &&
    typeof w.x === 'number' &&
    typeof w.y === 'number' &&
    (w.width === undefined || typeof w.width === 'number') &&
    (w.height === undefined || typeof w.height === 'number') &&
    (w.groupId === undefined || typeof w.groupId === 'string')
  );
};

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as DesktopSession;
  return (
    Array.isArray(s.windows) &&
    s.windows.every(isSessionWindow) &&
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

  return { session, setSession, resetSession };
}
