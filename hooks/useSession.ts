import { useMemo } from 'react';
import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';
import type { SnapArea } from '../types/windowLayout';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
  windowLayouts: Record<string, Record<string, SnapArea>>;
}

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
  windowLayouts: {},
};

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as DesktopSession;
  const layouts = (s as { windowLayouts?: unknown }).windowLayouts;
  const isValidLayouts = (() => {
    if (layouts === undefined) return true;
    if (!layouts || typeof layouts !== 'object') return false;
    return Object.values(layouts as Record<string, unknown>).every((sessionLayouts) => {
      if (!sessionLayouts || typeof sessionLayouts !== 'object') return false;
      return Object.values(sessionLayouts as Record<string, unknown>).every((slot) =>
        typeof slot === 'string',
      );
    });
  })();

  return (
    Array.isArray(s.windows) &&
    typeof s.wallpaper === 'string' &&
    Array.isArray(s.dock) &&
    isValidLayouts
  );
}

export default function useSession() {
  const [session, setSession, _reset, clear] = usePersistentState<DesktopSession>(
    'desktop-session',
    initialSession,
    isSession,
  );

  const normalizedSession = useMemo<DesktopSession>(() => {
    return {
      ...session,
      windowLayouts: session.windowLayouts ?? {},
    };
  }, [session]);

  const updateSession: typeof setSession = (value) => {
    setSession((previous) => {
      const safePrevious: DesktopSession = {
        ...previous,
        windowLayouts: previous.windowLayouts ?? {},
      };

      const next =
        typeof value === 'function'
          ? (value as (prevState: DesktopSession) => DesktopSession)(safePrevious)
          : value;

      return {
        ...next,
        windowLayouts: next.windowLayouts ?? {},
      };
    });
  };

  const resetSession = () => {
    clear();
  };

  return { session: normalizedSession, setSession: updateSession, resetSession };
}
