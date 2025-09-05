export interface SessionWindow {
  id: string;
  x: number;
  y: number;
}

export interface DesktopSession {
  windows: SessionWindow[];
  dock: string[];
}

const SESSION_KEY = 'desktop-session';
const AUTO_KEY = 'desktop-session-auto';

let currentSession: DesktopSession | null = null;

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
        typeof w.y === 'number',
    ) &&
    Array.isArray(s.dock)
  );
}

export const loadSession = (): DesktopSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isSession(parsed)) {
        currentSession = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

export const getCurrentSession = () => currentSession;

const persist = () => {
  if (typeof window === 'undefined' || !currentSession) return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  } catch {
    // ignore
  }
};

export const updateSession = (session: DesktopSession) => {
  currentSession = session;
  if (isAutoSaveEnabled()) persist();
};

export const saveSession = () => {
  persist();
};

export const clearSession = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  currentSession = null;
};

export const isAutoSaveEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(AUTO_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setAutoSave = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTO_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
  if (enabled && currentSession) persist();
};

const sessionManager = {
  loadSession,
  updateSession,
  saveSession,
  clearSession,
  isAutoSaveEnabled,
  setAutoSave,
  getCurrentSession,
};

export default sessionManager;

