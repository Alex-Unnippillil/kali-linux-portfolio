import { safeLocalStorage } from '../safeStorage';
import { publish, subscribe } from '../pubsub';

export interface ShortcutHintSettings {
  disabled: boolean;
  suppressedUntil: number;
}

export const shortcutHintDefaults: ShortcutHintSettings = {
  disabled: false,
  suppressedUntil: 0,
};

const STORAGE_KEY = 'shortcut-hints';
export const SHORTCUT_HINTS_TOPIC = 'shortcut-hints:settings';
export const SHORTCUT_HINT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const parseSettings = (raw: unknown): ShortcutHintSettings => {
  if (
    raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    typeof (raw as { disabled?: unknown }).disabled === 'boolean' &&
    typeof (raw as { suppressedUntil?: unknown }).suppressedUntil === 'number'
  ) {
    return raw as ShortcutHintSettings;
  }
  return shortcutHintDefaults;
};

const readSettings = (): ShortcutHintSettings => {
  if (!safeLocalStorage) return shortcutHintDefaults;
  try {
    const value = safeLocalStorage.getItem(STORAGE_KEY);
    if (!value) return shortcutHintDefaults;
    const parsed = JSON.parse(value);
    return parseSettings(parsed);
  } catch {
    return shortcutHintDefaults;
  }
};

const writeSettings = (settings: ShortcutHintSettings): ShortcutHintSettings => {
  if (safeLocalStorage) {
    try {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage failures
    }
  }
  publish(SHORTCUT_HINTS_TOPIC, settings);
  return settings;
};

export const getShortcutHintSettings = async (): Promise<ShortcutHintSettings> => {
  return readSettings();
};

export const setShortcutHintSettings = async (
  settings: ShortcutHintSettings,
): Promise<ShortcutHintSettings> => {
  return writeSettings(settings);
};

export const setShortcutHintsDisabled = async (
  disabled: boolean,
): Promise<ShortcutHintSettings> => {
  const current = readSettings();
  const next = { ...current, disabled };
  return writeSettings(next);
};

export const startShortcutHintCooldown = async (
  duration = SHORTCUT_HINT_COOLDOWN_MS,
): Promise<ShortcutHintSettings> => {
  const current = readSettings();
  const next = { ...current, suppressedUntil: Date.now() + duration };
  return writeSettings(next);
};

export const clearShortcutHintCooldown = async (): Promise<ShortcutHintSettings> => {
  const current = readSettings();
  if (!current.suppressedUntil) return current;
  const next = { ...current, suppressedUntil: 0 };
  return writeSettings(next);
};

export const onShortcutHintSettingsChange = (
  handler: (settings: ShortcutHintSettings) => void,
): (() => void) => {
  return subscribe(SHORTCUT_HINTS_TOPIC, (value) => {
    handler(parseSettings(value));
  });
};

export const isShortcutHintSuppressed = (
  settings: ShortcutHintSettings,
  now = Date.now(),
): boolean => {
  return settings.disabled || settings.suppressedUntil > now;
};
