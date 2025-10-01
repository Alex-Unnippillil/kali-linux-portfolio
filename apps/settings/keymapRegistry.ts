import usePersistentState from '../../hooks/usePersistentState';
import {
  ALL_SHORTCUTS,
  ORDERED_PLATFORMS,
  type ShortcutDefinition,
  type ShortcutPlatform,
} from '../../config/shortcuts';

export interface Shortcut {
  id: string;
  description: string;
  section: string;
  bindings: Record<ShortcutPlatform, string>;
}

type ShortcutOverrides = Partial<
  Record<string, Partial<Record<ShortcutPlatform, string>>>
>;

const createDefaultBindings = (
  shortcut: ShortcutDefinition
): Record<ShortcutPlatform, string> => {
  const bindings: Record<ShortcutPlatform, string> = {
    mac: shortcut.bindings.mac,
    windows: shortcut.bindings.windows,
    linux: shortcut.bindings.linux,
  };
  return bindings;
};

const validator = (value: unknown): value is ShortcutOverrides => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((platformMap) => {
    if (
      typeof platformMap !== 'object' ||
      platformMap === null ||
      Array.isArray(platformMap)
    ) {
      return false;
    }

    return Object.values(platformMap).every((binding) =>
      typeof binding === 'string'
    );
  });
};

export function useKeymap() {
  const [overrides, setOverrides] = usePersistentState<ShortcutOverrides>(
    'keymap',
    {},
    validator
  );

  const shortcuts: Shortcut[] = ALL_SHORTCUTS.map((shortcut) => {
    const defaultBindings = createDefaultBindings(shortcut);
    const overrideBindings = overrides[shortcut.id] ?? {};

    const bindings = { ...defaultBindings };

    ORDERED_PLATFORMS.forEach((platform) => {
      const overrideValue = overrideBindings[platform];
      if (overrideValue) {
        bindings[platform] = overrideValue;
      }
    });

    return {
      id: shortcut.id,
      description: shortcut.description,
      section: shortcut.section,
      bindings,
    };
  });

  const updateShortcut = (
    id: string,
    platform: ShortcutPlatform,
    keys: string
  ) => {
    const existing = overrides[id] ?? {};
    setOverrides({ ...overrides, [id]: { ...existing, [platform]: keys } });
  };

  return { shortcuts, updateShortcut };
}

export default useKeymap;
