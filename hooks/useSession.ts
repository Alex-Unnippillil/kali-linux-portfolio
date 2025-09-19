import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

const DEFAULT_DISPLAY_ID = 'display-1';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
}

export interface WorkspaceSession {
  windows: SessionWindow[];
  minimized: string[];
  focused: string | null;
  order: string[];
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
  workspaces?: Record<string, WorkspaceSession>;
  activeDisplay?: string;
  displays?: string[];
}

const initialSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
  workspaces: {
    [DEFAULT_DISPLAY_ID]: { windows: [], minimized: [], focused: null, order: [] },
  },
  activeDisplay: DEFAULT_DISPLAY_ID,
  displays: [DEFAULT_DISPLAY_ID],
};

function isSessionWindow(value: unknown): value is SessionWindow {
  if (!value || typeof value !== 'object') return false;
  const win = value as SessionWindow;
  return (
    typeof win.id === 'string' &&
    typeof win.x === 'number' &&
    typeof win.y === 'number'
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isWorkspaceSession(value: unknown): value is WorkspaceSession {
  if (!value || typeof value !== 'object') return false;
  const ws = value as WorkspaceSession;
  return (
    Array.isArray(ws.windows) &&
    ws.windows.every(isSessionWindow) &&
    isStringArray(ws.minimized) &&
    (typeof ws.focused === 'string' || ws.focused === null) &&
    isStringArray(ws.order)
  );
}

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as DesktopSession;
  if (!Array.isArray(s.windows) || !s.windows.every(isSessionWindow)) return false;
  if (typeof s.wallpaper !== 'string') return false;
  if (!isStringArray(s.dock)) return false;
  if (s.workspaces) {
    if (typeof s.workspaces !== 'object' || Array.isArray(s.workspaces)) return false;
    if (!Object.values(s.workspaces).every(isWorkspaceSession)) return false;
  }
  if (s.activeDisplay !== undefined && typeof s.activeDisplay !== 'string') return false;
  if (s.displays && !isStringArray(s.displays)) return false;
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
