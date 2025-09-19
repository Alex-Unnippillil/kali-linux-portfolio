import { useEffect, useRef } from 'react';
import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';
import { useProfileSwitcher } from './useProfileSwitcher';

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
  const { isGuest } = useProfileSwitcher();
  const [session, setSession, _reset, clear] = usePersistentState<DesktopSession>(
    'desktop-session',
    initialSession,
    isSession,
  );
  const wasGuest = useRef(isGuest);

  useEffect(() => {
    if (wasGuest.current && !isGuest) {
      clear();
    }
    wasGuest.current = isGuest;
  }, [isGuest, clear]);

  const resetSession = () => {
    clear();
  };

  return { session, setSession, resetSession };
}
