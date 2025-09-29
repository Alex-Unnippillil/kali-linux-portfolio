import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';
import {
  DesktopHistoryEntry,
  isDesktopHistoryEntry,
} from '../components/desktop/history';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
  history: DesktopHistoryEntry[];
}

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
  history: [],
};

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as DesktopSession;
  return (
    Array.isArray(s.windows) &&
    typeof s.wallpaper === 'string' &&
    Array.isArray(s.dock) &&
    Array.isArray((s as DesktopSession).history) &&
    (s.history as unknown[]).every((entry) => isDesktopHistoryEntry(entry))
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
