import type { Dispatch, SetStateAction } from 'react';

export type ShortcutCategory =
  | 'System'
  | 'Windows'
  | 'Utilities';

export interface ShortcutDefinition {
  /**
   * Stable identifier used for persistence.
   * Slugs are preferred, but legacy string identifiers are also supported via `legacyIds`.
   */
  id: string;
  /**
   * Friendly label for the action exposed to users.
   */
  action: string;
  /**
   * Short help text describing what the action does.
   */
  description: string;
  /**
   * Category heading for grouping related shortcuts in the UI.
   */
  category: ShortcutCategory;
  /**
   * Default key binding shipped with the system.
   */
  defaultKeys: string;
  /**
   * Legacy identifiers that should map to the same action.
   * Useful for migrating existing `localStorage` values.
   */
  legacyIds?: string[];
}

export interface ShortcutMap {
  [shortcutId: string]: string;
}

export interface ResolvedShortcut extends ShortcutDefinition {
  /**
   * Effective key binding after applying user overrides.
   */
  keys: string;
  /**
   * Indicates whether the shortcut matches the factory default mapping.
   */
  isDefault: boolean;
  /**
   * Other shortcuts that use the same key binding.
   */
  conflictsWith: string[];
}

export interface ShortcutUpdate {
  id: string;
  keys: string;
}

export interface ShortcutRegistryHook {
  shortcuts: ResolvedShortcut[];
  /**
   * Conflicts grouped by key binding. The map only contains entries that clash.
   */
  conflicts: Map<string, string[]>;
  updateShortcut: (id: string, keys: string) => void;
  resetShortcut: (id: string) => void;
  restoreDefaults: () => void;
  setMap: Dispatch<SetStateAction<ShortcutMap>>;
}

export const SHORTCUT_STORAGE_KEY = 'keymap';

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: 'show-shortcuts',
    action: 'Show keyboard shortcuts',
    description: 'Toggle the on-screen cheat sheet.',
    category: 'System',
    defaultKeys: '?',
    legacyIds: ['Show keyboard shortcuts'],
  },
  {
    id: 'open-settings',
    action: 'Open settings',
    description: 'Launch the system settings window.',
    category: 'System',
    defaultKeys: 'Ctrl+,',
    legacyIds: ['Open settings'],
  },
  {
    id: 'open-clipboard-manager',
    action: 'Open clipboard manager',
    description: 'Open the Clipboard Manager utility.',
    category: 'Utilities',
    defaultKeys: 'Ctrl+Shift+V',
  },
  {
    id: 'switch-apps',
    action: 'Switch between apps',
    description: 'Cycle focus between open application windows.',
    category: 'Windows',
    defaultKeys: 'Alt+Tab',
  },
  {
    id: 'cycle-app-windows',
    action: 'Cycle windows of current app',
    description: 'Rotate through multiple windows of the focused app.',
    category: 'Windows',
    defaultKeys: 'Alt+~',
  },
];

const MODIFIER_ORDER: readonly string[] = ['Ctrl', 'Alt', 'Shift', 'Super'];

const KEY_ALIASES: Record<string, string> = {
  control: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  meta: 'Super',
  super: 'Super',
  command: 'Super',
  cmd: 'Super',
  win: 'Super',
  os: 'Super',
  space: 'Space',
  ' ': 'Space',
  esc: 'Escape',
  escape: 'Escape',
  enter: 'Enter',
  return: 'Enter',
  tab: 'Tab',
  capslock: 'CapsLock',
  backspace: 'Backspace',
  delete: 'Delete',
  insert: 'Insert',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
};

const isModifierKey = (key: string) =>
  key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta';

const normalizePart = (part: string): string => {
  const trimmed = part.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const alias = KEY_ALIASES[lower];
  if (alias) return alias;
  if (trimmed.length === 1) return trimmed.toUpperCase();
  return trimmed[0].toUpperCase() + trimmed.slice(1);
};

export const normalizeBinding = (binding: string): string => {
  if (!binding) return '';
  const seen = new Set<string>();
  const modifiers: string[] = [];
  const keys: string[] = [];

  for (const rawPart of binding.split('+')) {
    const part = normalizePart(rawPart);
    if (!part) continue;
    if (MODIFIER_ORDER.includes(part)) {
      if (!seen.has(part)) {
        seen.add(part);
        modifiers.push(part);
      }
    } else {
      keys.push(part);
    }
  }

  modifiers.sort(
    (a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b),
  );

  return [...modifiers, ...keys].join('+');
};

export interface KeyBindingEventLike {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

export const formatKeybinding = (event: KeyBindingEventLike): string => {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Super');

  const key = event.key || '';
  if (!isModifierKey(key)) {
    parts.push(normalizePart(key));
  } else if (parts.length === 0) {
    parts.push(normalizePart(key));
  }

  return normalizeBinding(parts.join('+'));
};

export const createDefaultShortcutMap = (
  definitions: ShortcutDefinition[] = SHORTCUT_DEFINITIONS,
): ShortcutMap => {
  const map: ShortcutMap = {};
  for (const shortcut of definitions) {
    map[shortcut.id] = normalizeBinding(shortcut.defaultKeys);
  }
  return map;
};

export const shortcutMapValidator = (value: unknown): value is ShortcutMap => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((v) => typeof v === 'string');
};

export const upgradeShortcutMap = (
  map: ShortcutMap,
  definitions: ShortcutDefinition[] = SHORTCUT_DEFINITIONS,
): ShortcutMap => {
  let mutated = false;
  const next: ShortcutMap = { ...map };

  for (const definition of definitions) {
    if (next[definition.id] !== undefined) continue;
    const legacy = definition.legacyIds ?? [];
    for (const legacyId of legacy) {
      if (next[legacyId] !== undefined) {
        next[definition.id] = next[legacyId];
        delete next[legacyId];
        mutated = true;
        break;
      }
    }
  }

  return mutated ? next : map;
};

export const resolveShortcuts = (
  map: ShortcutMap,
  definitions: ShortcutDefinition[] = SHORTCUT_DEFINITIONS,
): ResolvedShortcut[] => {
  const resolved = definitions.map<ResolvedShortcut>((definition) => {
    const stored =
      map[definition.id] ??
      (definition.legacyIds
        ? definition.legacyIds
            .map((legacyId) => map[legacyId])
            .find((value) => value !== undefined)
        : undefined);
    const keys = normalizeBinding(stored ?? definition.defaultKeys);
    const defaultKeys = normalizeBinding(definition.defaultKeys);
    return {
      ...definition,
      keys,
      isDefault: keys === defaultKeys,
      conflictsWith: [],
    };
  });

  const collisions = new Map<string, ResolvedShortcut[]>();
  for (const shortcut of resolved) {
    if (!shortcut.keys) continue;
    const list = collisions.get(shortcut.keys) ?? [];
    list.push(shortcut);
    collisions.set(shortcut.keys, list);
  }

  for (const [, list] of collisions) {
    if (list.length <= 1) continue;
    const ids = list.map((item) => item.id);
    for (const item of list) {
      item.conflictsWith = ids.filter((id) => id !== item.id);
    }
  }

  return resolved;
};

export const detectConflicts = (
  shortcuts: Iterable<Pick<ResolvedShortcut, 'id' | 'keys'>>,
): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  for (const shortcut of shortcuts) {
    const binding = shortcut.keys;
    if (!binding) continue;
    const list = map.get(binding) ?? [];
    list.push(shortcut.id);
    map.set(binding, list);
  }

  for (const [binding, ids] of Array.from(map.entries())) {
    if (ids.length <= 1) {
      map.delete(binding);
    }
  }

  return map;
};

