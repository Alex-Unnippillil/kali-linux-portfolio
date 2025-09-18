import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  minimized?: boolean;
}

export interface DisplaySession {
  id: string;
  name: string;
  windows: SessionWindow[];
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
  displays?: DisplaySession[];
  activeDisplay?: string;
}

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
  displays: [],
  activeDisplay: 'display-1',
};

const isSessionWindow = (value: unknown): value is SessionWindow => {
  if (!value || typeof value !== 'object') return false;
  const w = value as SessionWindow;
  return (
    typeof w.id === 'string' &&
    typeof w.x === 'number' &&
    typeof w.y === 'number'
  );
};

const isDisplaySession = (value: unknown): value is DisplaySession => {
  if (!value || typeof value !== 'object') return false;
  const d = value as DisplaySession;
  return (
    typeof d.id === 'string' &&
    typeof d.name === 'string' &&
    Array.isArray(d.windows) &&
    d.windows.every(isSessionWindow)
  );
};

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as DesktopSession;
  if (!Array.isArray(s.windows) || typeof s.wallpaper !== 'string' || !Array.isArray(s.dock)) {
    return false;
  }
  if (!s.windows.every(isSessionWindow)) return false;
  if (s.displays !== undefined && !Array.isArray(s.displays)) return false;
  if (Array.isArray(s.displays) && !s.displays.every(isDisplaySession)) return false;
  if (s.activeDisplay !== undefined && typeof s.activeDisplay !== 'string') return false;
  return true;
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
