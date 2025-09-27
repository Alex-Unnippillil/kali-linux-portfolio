import usePersistentState from '../../hooks/usePersistentState';

export interface Shortcut {
  description: string;
  keys: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { description: 'Show keyboard shortcuts', keys: '?' },
  { description: 'Open settings', keys: 'Ctrl+,' },
  { description: 'Move window up', keys: 'Ctrl+ArrowUp' },
  { description: 'Move window down', keys: 'Ctrl+ArrowDown' },
  { description: 'Move window left', keys: 'Ctrl+ArrowLeft' },
  { description: 'Move window right', keys: 'Ctrl+ArrowRight' },
  { description: 'Shrink window height', keys: 'Ctrl+Shift+ArrowUp' },
  { description: 'Grow window height', keys: 'Ctrl+Shift+ArrowDown' },
  { description: 'Shrink window width', keys: 'Ctrl+Shift+ArrowLeft' },
  { description: 'Grow window width', keys: 'Ctrl+Shift+ArrowRight' },
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

  const [map, setMap] = usePersistentState<Record<string, string>>(
    'keymap',
    initial,
    validator
  );

  const shortcuts = DEFAULT_SHORTCUTS.map(({ description, keys }) => ({
    description,
    keys: map[description] || keys,
  }));

  const updateShortcut = (description: string, keys: string) =>
    setMap({ ...map, [description]: keys });

  return { shortcuts, updateShortcut };
}

export default useKeymap;
