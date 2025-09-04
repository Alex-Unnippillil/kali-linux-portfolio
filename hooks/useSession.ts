import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
  bounds: Record<string, WindowBounds>;
}

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
  bounds: {},
};

function isBounds(value: any): value is WindowBounds {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number'
  );
}

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as DesktopSession;
  const windowsValid = Array.isArray(s.windows) &&
    s.windows.every(
      (w) =>
        w &&
        typeof w.id === 'string' &&
        typeof w.x === 'number' &&
        typeof w.y === 'number' &&
        typeof w.width === 'number' &&
        typeof w.height === 'number'
    );
  const boundsValid =
    s.bounds &&
    typeof s.bounds === 'object' &&
    Object.values(s.bounds).every(isBounds);
  return (
    windowsValid &&
    typeof s.wallpaper === 'string' &&
    Array.isArray(s.dock) &&
    boundsValid
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
