import {
  PermissionDecision,
  PermissionPreference,
  PermissionType,
} from '../types/permissions';

const STORAGE_KEY = 'permission-preferences';
const DISMISS_SNOOZE_MS = 60 * 60 * 1000; // 1 hour snooze for dismissed prompts

type PreferenceStore = Partial<Record<PermissionType, PermissionPreference>>;

const hasWindow = () => typeof window !== 'undefined';

const readStore = (): PreferenceStore => {
  if (!hasWindow()) {
    return {} as PreferenceStore;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as PreferenceStore;
    const parsed = JSON.parse(raw) as PreferenceStore;
    return parsed ?? ({} as PreferenceStore);
  } catch {
    return {} as PreferenceStore;
  }
};

const writeStore = (store: PreferenceStore) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore write errors
  }
};

export const clearPermissionPreference = (permission: PermissionType) => {
  if (!hasWindow()) return;
  const store = readStore();
  if (store[permission]) {
    delete store[permission];
    writeStore(store);
  }
};

export const getPermissionPreference = (
  permission: PermissionType,
): PermissionPreference | null => {
  if (!hasWindow()) return null;
  const store = readStore();
  return store[permission] ?? null;
};

export const recordPermissionDecision = (
  permission: PermissionType,
  decision: PermissionDecision,
  remember: boolean,
) => {
  if (!hasWindow()) return;
  const store = readStore();
  if (remember) {
    store[permission] = {
      decision,
      remember: true,
      updatedAt: Date.now(),
    };
  } else if (decision === 'denied') {
    store[permission] = {
      decision,
      remember: false,
      updatedAt: Date.now(),
      snoozedUntil: Date.now() + DISMISS_SNOOZE_MS,
    };
  } else {
    delete store[permission];
  }
  writeStore(store);
};

export const shouldPromptPermission = (permission: PermissionType): boolean => {
  const preference = getPermissionPreference(permission);
  if (!preference) return true;
  if (preference.remember) return false;
  if (preference.snoozedUntil) {
    if (preference.snoozedUntil > Date.now()) {
      return false;
    }
    clearPermissionPreference(permission);
  }
  return true;
};

export { DISMISS_SNOOZE_MS };
