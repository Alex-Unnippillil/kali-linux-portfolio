import usePersistentState from '../../hooks/usePersistentState';

export interface Shortcut {
  description: string;
  keys: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { description: 'Show keyboard shortcuts', keys: '?' },
  { description: 'Open settings', keys: 'Ctrl+,' },
  { description: 'Window switcher', keys: 'Alt+Tab' },
  { description: 'Workspace switcher', keys: 'Ctrl+Alt+W' },
  { description: 'Focus panel', keys: 'Ctrl+Alt+Tab' },
  { description: 'Close window', keys: 'Alt+F4' },
  { description: 'Switch workspace left', keys: 'Ctrl+Alt+ArrowLeft' },
  { description: 'Switch workspace right', keys: 'Ctrl+Alt+ArrowRight' },
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
