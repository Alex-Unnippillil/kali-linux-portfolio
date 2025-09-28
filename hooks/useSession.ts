import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
}

export interface DesktopLauncherState {
  favorites: string[];
  ordering: string[];
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
  launcher?: DesktopLauncherState;
}

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
  launcher: {
    favorites: [],
    ordering: [],
  },
};

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as DesktopSession;
  const launcher = (s as DesktopSession).launcher;
  const launcherValid =
    launcher === undefined ||
    (
      typeof launcher === 'object' &&
      Array.isArray((launcher as DesktopLauncherState).favorites ?? []) &&
      Array.isArray((launcher as DesktopLauncherState).ordering ?? [])
    );
  return (
    Array.isArray(s.windows) &&
    typeof s.wallpaper === 'string' &&
    Array.isArray(s.dock) &&
    launcherValid
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
