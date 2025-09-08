import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  snap?: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;
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
        typeof w.width === 'number' &&
        typeof w.height === 'number' &&
        typeof w.order === 'number' &&
        (w.snap === undefined ||
          w.snap === null ||
          w.snap === 'left' ||
          w.snap === 'right' ||
          w.snap === 'top' ||
          w.snap === 'bottom' ||
          w.snap === 'top-left' ||
          w.snap === 'top-right' ||
          w.snap === 'bottom-left' ||
          w.snap === 'bottom-right'),
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

  return { session, setSession, resetSession };
}
