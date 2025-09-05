import type { DesktopSession } from '../hooks/useSession';

export interface SessionProfile {
  id: string;
  name: string;
  session: DesktopSession;
}

const STORAGE_KEY = 'session-profiles';
const DEFAULT_KEY = 'default-session';

function readProfiles(): SessionProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionProfile[]) : [];
  } catch {
    return [];
  }
}

function writeProfiles(list: SessionProfile[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listSessions(): SessionProfile[] {
  return readProfiles();
}

export function saveSession(profile: SessionProfile): void {
  const sessions = readProfiles();
  const idx = sessions.findIndex((s) => s.id === profile.id);
  if (idx >= 0) {
    sessions[idx] = profile;
  } else {
    sessions.push(profile);
  }
  writeProfiles(sessions);
}

export function setDefaultSession(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEFAULT_KEY, id);
}

export function getDefaultSession(): SessionProfile | null {
  if (typeof window === 'undefined') return null;
  const id = window.localStorage.getItem(DEFAULT_KEY);
  return readProfiles().find((p) => p.id === id) || null;
}

export function removeSession(id: string): void {
  const sessions = readProfiles().filter((s) => s.id !== id);
  writeProfiles(sessions);
  const current = typeof window === 'undefined' ? null : window.localStorage.getItem(DEFAULT_KEY);
  if (current === id) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DEFAULT_KEY);
    }
  }
}

