import { useCallback } from 'react';
import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
  snap?: 'left' | 'right' | 'top' | null;
}

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
}

export type WindowAction =
  | { type: 'open'; win: SessionWindow }
  | { type: 'close'; id: string }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'snap'; id: string; snap: SessionWindow['snap'] };

function reducer(state: DesktopSession, action: WindowAction): DesktopSession {
  switch (action.type) {
    case 'open':
      return {
        ...state,
        windows: [
          ...state.windows.filter((w) => w.id !== action.win.id),
          action.win,
        ],
      };
    case 'close':
      return {
        ...state,
        windows: state.windows.filter((w) => w.id !== action.id),
      };
    case 'move':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, x: action.x, y: action.y } : w,
        ),
      };
    case 'snap':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, snap: action.snap } : w,
        ),
      };
    default:
      return state;
  }
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
    s.windows.every(
      (w) =>
        w &&
        typeof w.id === 'string' &&
        typeof w.x === 'number' &&
        typeof w.y === 'number' &&
        (w.snap === undefined ||
          w.snap === null ||
          w.snap === 'left' ||
          w.snap === 'right' ||
          w.snap === 'top'),
    ) &&
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

  const dispatch = useCallback(
    (action: WindowAction) => {
      setSession((prev) => reducer(prev, action));
    },
    [setSession],
  );

  const resetSession = () => {
    clear();
  };

  return { session, setSession, resetSession, dispatch };
}
