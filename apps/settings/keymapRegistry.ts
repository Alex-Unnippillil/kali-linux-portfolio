import { useEffect, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { normalizeShortcutString } from './utils/shortcutParser';

interface ShortcutDefinition {
  description: string;
  keys: string;
}

export interface Shortcut {
  description: string;
  keys: string;
  defaultKeys: string;
  isDefault: boolean;
}

const DEFAULT_SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { description: 'Show keyboard shortcuts', keys: '?' },
  { description: 'Open settings', keys: 'Ctrl+,' },
];

export const DEFAULT_SHORTCUTS = DEFAULT_SHORTCUT_DEFINITIONS.map(
  ({ description, keys }) => ({
    description,
    keys: normalizeShortcutString(keys),
  })
);

const DEFAULT_SHORTCUT_MAP = DEFAULT_SHORTCUTS.reduce<Record<string, string>>(
  (acc, shortcut) => {
    acc[shortcut.description] = shortcut.keys;
    return acc;
  },
  {}
);

const validator = (value: unknown): value is Record<string, string> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every(
      (v) => typeof v === 'string'
    )
  );
};

export function useKeymap() {
  const [map, setMap] = usePersistentState<Record<string, string>>(
    'keymap',
    DEFAULT_SHORTCUT_MAP,
    validator
  );

  useEffect(() => {
    const updates: Record<string, string> = {};
    let changed = false;
    Object.entries(map).forEach(([description, value]) => {
      if (typeof value !== 'string') return;
      const normalized = normalizeShortcutString(value);
      if (normalized && normalized !== value) {
        updates[description] = normalized;
        changed = true;
      }
    });
    if (changed) {
      setMap((prev) => ({ ...prev, ...updates }));
    }
  }, [map, setMap]);

  const shortcuts = useMemo(
    () =>
      DEFAULT_SHORTCUTS.map(({ description, keys: defaultKeys }) => {
        const stored = map[description];
        const normalized = stored
          ? normalizeShortcutString(stored)
          : defaultKeys;
        const resolved = normalized || defaultKeys;
        return {
          description,
          keys: resolved,
          defaultKeys,
          isDefault: resolved === defaultKeys,
        };
      }),
    [map]
  );

  const updateShortcut = (description: string, keys: string) => {
    const normalized = normalizeShortcutString(keys);
    if (!normalized) return;
    setMap((prev) => ({ ...prev, [description]: normalized }));
  };

  const resetShortcut = (description: string) => {
    const defaultValue = DEFAULT_SHORTCUT_MAP[description];
    if (!defaultValue) return;
    setMap((prev) => ({ ...prev, [description]: defaultValue }));
  };

  return { shortcuts, updateShortcut, resetShortcut };
}

export default useKeymap;
