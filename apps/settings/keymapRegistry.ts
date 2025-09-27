import usePersistentState from '../../hooks/usePersistentState';
import {
  DEFAULT_SHORTCUTS,
  ShortcutDefinition,
} from '../../data/shortcuts';
import { normalizeShortcut } from '../../utils/keyboard';

export type Shortcut = ShortcutDefinition;

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
  const initial = DEFAULT_SHORTCUTS.reduce<Record<string, string>>(
    (acc, s) => {
      acc[s.description] = normalizeShortcut(s.keys);
      return acc;
    },
    {}
  );

  const [map, setMap] = usePersistentState<Record<string, string>>(
    'keymap',
    initial,
    validator
  );

  const shortcuts: Shortcut[] = DEFAULT_SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    keys: normalizeShortcut(map[shortcut.description] || shortcut.keys),
  }));

  const updateShortcut = (description: string, keys: string) =>
    setMap({ ...map, [description]: normalizeShortcut(keys) });

  return { shortcuts, updateShortcut };
}

export default useKeymap;
