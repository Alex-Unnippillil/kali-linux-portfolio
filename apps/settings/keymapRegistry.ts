import usePersistentState from '../../hooks/usePersistentState';

export interface Shortcut {
  description: string;
  keys: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { description: 'Show keyboard shortcuts', keys: 'Shift+?' },
  { description: 'Open settings', keys: 'Ctrl+,' },
];

const sanitizeKeys = (keys: string) => {
  if (keys === '?') return 'Shift+?';
  return keys;
};

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

  const [map, setMap] = usePersistentState<Record<string, string>>(
    'keymap',
    initial,
    validator
  );

  const normalizedMap = Object.entries(map).reduce<Record<string, string>>(
    (acc, [description, keys]) => {
      acc[description] = sanitizeKeys(keys);
      return acc;
    },
    {}
  );

  const shortcuts = DEFAULT_SHORTCUTS.map(({ description, keys }) => ({
    description,
    keys: normalizedMap[description] || sanitizeKeys(keys),
  }));

  const updateShortcut = (description: string, keys: string) =>
    setMap({ ...normalizedMap, [description]: keys });

  return { shortcuts, updateShortcut };
}

export default useKeymap;
