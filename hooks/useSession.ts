import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearShellLayout,
  loadShellLayout,
  persistShellLayout,
  sanitizeShellLayout,
  ShellLayoutState,
  ShellWindowDescriptor,
} from '../utils/layoutPersistence';
import { defaults } from '../utils/settingsStore';

export interface DesktopSession {
  windows: ShellWindowDescriptor[];
  wallpaper: string;
  dock: string[];
}

const createInitialSession = (): DesktopSession => ({
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
});

const toDesktopSession = (layout: ShellLayoutState | null | undefined): DesktopSession => {
  const sanitized = sanitizeShellLayout(layout ?? { windows: [] });
  return {
    windows: sanitized.windows,
    wallpaper: sanitized.wallpaper ?? defaults.wallpaper,
    dock: sanitized.dock ?? [],
  };
};

export default function useSession() {
  const [session, setSessionState] = useState<DesktopSession>(() => {
    const stored = loadShellLayout();
    if (stored) {
      return toDesktopSession(stored);
    }
    return createInitialSession();
  });

  const resetFlagRef = useRef(false);

  useEffect(() => {
    if (resetFlagRef.current) {
      resetFlagRef.current = false;
      return;
    }
    persistShellLayout(session);
  }, [session]);

  const setSession = useCallback(
    (updater: DesktopSession | ((prev: DesktopSession) => DesktopSession)) => {
      setSessionState((previous) => {
        const nextValue =
          typeof updater === 'function' ? (updater as (prev: DesktopSession) => DesktopSession)(previous) : updater;
        return toDesktopSession(nextValue);
      });
    },
  []);

  const resetSession = useCallback(() => {
    resetFlagRef.current = true;
    setSessionState(createInitialSession());
    clearShellLayout();
  }, []);

  return { session, setSession, resetSession };
}
