import { useEffect } from 'react';
import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';
import { clampWindowPosition } from '../utils/windowBounds';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!session || !Array.isArray(session.windows) || session.windows.length === 0) {
      return;
    }

    const sanitizedWindows = session.windows.map((win) => {
      const { x, y } = clampWindowPosition(win);
      return { ...win, x, y };
    });

    const changed = sanitizedWindows.some((win, index) => {
      const original = session.windows[index];
      return win.x !== original.x || win.y !== original.y;
    });

    if (changed) {
      setSession({ ...session, windows: sanitizedWindows });
    }
  }, [session, setSession]);

  const resetSession = () => {
    clear();
  };

  return { session, setSession, resetSession };
}
