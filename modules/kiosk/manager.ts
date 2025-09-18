import { safeLocalStorage } from '../../utils/safeStorage';

export type KioskRestrictionKey =
  | 'disableContextMenus'
  | 'disableAppSwitching'
  | 'disableQuickSettings';

export interface KioskRestrictions {
  disableContextMenus: boolean;
  disableAppSwitching: boolean;
  disableQuickSettings: boolean;
}

export interface KioskExitCredentials {
  type: 'pin' | 'password';
  secret: string;
}

export interface KioskProfile {
  id: string;
  name: string;
  allowedApps: string[];
  restrictions: Partial<KioskRestrictions>;
  exitCredentials: KioskExitCredentials;
}

export interface KioskManagerState {
  profiles: KioskProfile[];
  activeProfile: KioskProfile | null;
  restrictions: KioskRestrictions;
}

const STORAGE_KEY = 'kiosk-profiles';
const ACTIVE_KEY = 'kiosk-active-profile';
const DEFAULT_RESTRICTIONS: KioskRestrictions = {
  disableContextMenus: false,
  disableAppSwitching: false,
  disableQuickSettings: false,
};

const normalizeRestrictions = (
  restrictions?: Partial<KioskRestrictions>,
): KioskRestrictions => ({
  ...DEFAULT_RESTRICTIONS,
  ...(restrictions ?? {}),
});

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const parseAllowedApps = (allowedApps: unknown): string[] => {
  if (Array.isArray(allowedApps)) {
    return allowedApps
      .map(app => (isNonEmptyString(app) ? app.trim() : null))
      .filter((app): app is string => Boolean(app));
  }
  if (isNonEmptyString(allowedApps)) {
    return allowedApps
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const generateId = () => `kiosk-${Math.random().toString(36).slice(2, 11)}`;

class KioskProfileManager {
  private profiles: Map<string, KioskProfile> = new Map();
  private activeProfileId: string | null = null;
  private listeners: Set<(state: KioskManagerState) => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = safeLocalStorage?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(profile => {
            const normalized = this.normalizeProfile(profile);
            this.profiles.set(normalized.id, normalized);
          });
        }
      }
      const active = safeLocalStorage?.getItem(ACTIVE_KEY);
      if (active && this.profiles.has(active)) {
        this.activeProfileId = active;
      }
    } catch {
      this.profiles.clear();
      this.activeProfileId = null;
    }
  }

  private persist() {
    try {
      const serialized = JSON.stringify(this.listProfiles());
      safeLocalStorage?.setItem(STORAGE_KEY, serialized);
      if (this.activeProfileId) {
        safeLocalStorage?.setItem(ACTIVE_KEY, this.activeProfileId);
      } else {
        safeLocalStorage?.removeItem(ACTIVE_KEY);
      }
    } catch {
      // ignore persistence errors (e.g., private browsing)
    }
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }

  private normalizeProfile(input: any): KioskProfile {
    const id = isNonEmptyString(input?.id) ? input.id : generateId();
    const name = isNonEmptyString(input?.name) ? input.name.trim() : 'Untitled Kiosk Profile';
    const allowedApps = parseAllowedApps(input?.allowedApps);
    const restrictions = normalizeRestrictions(input?.restrictions);
    const exitType: KioskExitCredentials['type'] =
      input?.exitCredentials?.type === 'password' ? 'password' : 'pin';
    const secret = isNonEmptyString(input?.exitCredentials?.secret)
      ? input.exitCredentials.secret
      : '';

    return {
      id,
      name,
      allowedApps,
      restrictions,
      exitCredentials: {
        type: exitType,
        secret,
      },
    };
  }

  getState(): KioskManagerState {
    return {
      profiles: this.listProfiles(),
      activeProfile: this.getActiveProfile(),
      restrictions: this.getRestrictions(),
    };
  }

  subscribe(listener: (state: KioskManagerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  listProfiles(): KioskProfile[] {
    return Array.from(this.profiles.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getProfile(id: string): KioskProfile | null {
    return this.profiles.get(id) ?? null;
  }

  getActiveProfile(): KioskProfile | null {
    if (!this.activeProfileId) return null;
    return this.profiles.get(this.activeProfileId) ?? null;
  }

  getRestrictions(): KioskRestrictions {
    const active = this.getActiveProfile();
    return normalizeRestrictions(active?.restrictions);
  }

  canLaunchApp(appId: string): boolean {
    const active = this.getActiveProfile();
    if (!active) return true;
    const { allowedApps } = active;
    if (!allowedApps.length || allowedApps.includes('*')) {
      return true;
    }
    return allowedApps.includes(appId);
  }

  isRestrictionEnabled(key: KioskRestrictionKey): boolean {
    const restrictions = this.getRestrictions();
    return Boolean(restrictions[key]);
  }

  createProfile(profile: Partial<KioskProfile>): KioskProfile {
    const normalized = this.normalizeProfile(profile);
    this.profiles.set(normalized.id, normalized);
    this.persist();
    this.notify();
    return normalized;
  }

  updateProfile(id: string, patch: Partial<KioskProfile>): KioskProfile | null {
    const existing = this.profiles.get(id);
    if (!existing) return null;
    const updated = this.normalizeProfile({ ...existing, ...patch, id });
    this.profiles.set(id, updated);
    if (this.activeProfileId === id) {
      this.activeProfileId = updated.id;
    }
    this.persist();
    this.notify();
    return updated;
  }

  deleteProfile(id: string) {
    if (!this.profiles.has(id)) return;
    this.profiles.delete(id);
    if (this.activeProfileId === id) {
      this.activeProfileId = null;
    }
    this.persist();
    this.notify();
  }

  activateProfile(id: string): boolean {
    if (!this.profiles.has(id)) return false;
    this.activeProfileId = id;
    this.persist();
    this.notify();
    return true;
  }

  deactivateProfile(secret: string): boolean {
    const active = this.getActiveProfile();
    if (!active) return true;
    if (active.exitCredentials.secret && active.exitCredentials.secret !== secret) {
      return false;
    }
    this.activeProfileId = null;
    this.persist();
    this.notify();
    return true;
  }

  exportProfiles(pretty = true): string {
    const spaces = pretty ? 2 : 0;
    return JSON.stringify(this.listProfiles(), null, spaces);
  }

  importProfiles(data: string) {
    try {
      const parsed = JSON.parse(data);
      const profiles = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.profiles)
        ? parsed.profiles
        : [];
      profiles.forEach(profile => {
        const normalized = this.normalizeProfile(profile);
        this.profiles.set(normalized.id, normalized);
      });
      if (this.activeProfileId && !this.profiles.has(this.activeProfileId)) {
        this.activeProfileId = null;
      }
      this.persist();
      this.notify();
    } catch {
      throw new Error('Invalid kiosk profile data');
    }
  }
}

const kioskManager = new KioskProfileManager();

export default kioskManager;
