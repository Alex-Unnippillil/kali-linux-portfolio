import usePersistentState from '../../hooks/usePersistentState';
import {
  GLOBAL_SHORTCUTS,
  ShortcutDefinition,
} from '../../hooks/useShortcuts';

export interface Shortcut {
  description: string;
  keys: string;
}

const CUSTOMIZABLE_SHORTCUTS: ShortcutDefinition[] = GLOBAL_SHORTCUTS.filter(
  (shortcut) => shortcut.customizable
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
  const initial = CUSTOMIZABLE_SHORTCUTS.reduce<Record<string, string>>(
    (acc, s) => {
      acc[s.description] = s.binding;
      return acc;
    },
    {}
  );

  const [map, setMap] = usePersistentState<Record<string, string>>(
    'keymap',
    initial,
    validator
  );

  const shortcutsWithMetadata = CUSTOMIZABLE_SHORTCUTS.map(
    ({ id, description, binding }) => ({
      id,
      description,
      keys: map[description] || binding,
    })
  );

  const overrides = new Map(
    shortcutsWithMetadata.map(({ id, keys }) => [id, keys] as const)
  );

  const shortcuts = shortcutsWithMetadata.map(({ description, keys }) => ({
    description,
    keys,
  }));

  const updateShortcut = (description: string, keys: string) =>
    setMap({ ...map, [description]: keys });

  return { shortcuts, overrides, updateShortcut };
}

export default useKeymap;
