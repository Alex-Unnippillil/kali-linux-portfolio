import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
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
  if (!Array.isArray(s.windows) || typeof s.wallpaper !== 'string' || !Array.isArray(s.dock)) {
    return false;
  }
  return s.windows.every((win) => {
    if (!win || typeof win !== 'object') return false;
    const candidate = win as SessionWindow;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.x === 'number' &&
      typeof candidate.y === 'number' &&
      (candidate.width === undefined || typeof candidate.width === 'number') &&
      (candidate.height === undefined || typeof candidate.height === 'number')
    );
  });
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
