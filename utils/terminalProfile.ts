export interface TerminalProfile {
  font: string;
  opacity: number;
  bell: boolean;
  prompt: string;
}

const defaultProfile: TerminalProfile = {
  font: 'monospace',
  opacity: 1,
  bell: true,
  prompt: '$',
};

const STORAGE_KEY = 'terminal:profile';

export function loadTerminalProfile(): TerminalProfile {
  if (typeof window === 'undefined') return defaultProfile;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw) as Partial<TerminalProfile>;
    return { ...defaultProfile, ...parsed };
  } catch {
    return defaultProfile;
  }
}

export function saveTerminalProfile(profile: TerminalProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore write errors
  }
}

export function exportTerminalProfile(): string {
  return JSON.stringify(loadTerminalProfile());
}

export function prepareImportTerminalProfile(
  json: string,
): TerminalProfile | null {
  try {
    const parsed = JSON.parse(json) as Partial<TerminalProfile>;
    if (!parsed || typeof parsed !== 'object') return null;
    const current = loadTerminalProfile();
    const merged: TerminalProfile = { ...current };
    if (typeof parsed.font === 'string') merged.font = parsed.font;
    if (typeof parsed.opacity === 'number') merged.opacity = parsed.opacity;
    if (typeof parsed.bell === 'boolean') merged.bell = parsed.bell;
    if (typeof parsed.prompt === 'string') merged.prompt = parsed.prompt;
    return merged;
  } catch {
    return null;
  }
}

export { defaultProfile as defaultTerminalProfile };
