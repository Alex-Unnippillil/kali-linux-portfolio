import usePersistentState from '../../hooks/usePersistentState';

export interface Shortcut {
  description: string;
  keys: string;
}

export const KEYMAP_STORAGE_KEY = 'keymap';

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { description: 'Show keyboard shortcuts', keys: '?' },
  { description: 'Open settings', keys: 'Ctrl+,' },
];

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
      acc[s.description] = s.keys;
      return acc;
    },
    {}
  );

  const [map, setMap, , clearKeymap] = usePersistentState<Record<string, string>>(
    KEYMAP_STORAGE_KEY,
    initial,
    validator
  );

  const shortcuts = DEFAULT_SHORTCUTS.map(({ description, keys }) => ({
    description,
    keys: map[description] || keys,
  }));

  const updateShortcut = (description: string, keys: string) =>
    setMap((previous) => ({ ...previous, [description]: keys }));

  const resetKeymap = () => clearKeymap();

  return { shortcuts, updateShortcut, resetKeymap };
}

export const getDefaultShortcutForDescription = (description: string): string =>
  DEFAULT_SHORTCUTS.find((shortcut) => shortcut.description === description)?.keys || '';

export default useKeymap;
