import { useMemo } from 'react';

export type ShortcutCategory =
  | 'Launcher'
  | 'Window management'
  | 'Utilities'
  | 'System'
  | 'Help';

export interface ShortcutDefinition {
  /** Stable identifier used for lookups and overrides. */
  id: string;
  /** Human-readable description for UI surfaces. */
  description: string;
  /** Semantic category used to group shortcuts in help overlays. */
  category: ShortcutCategory;
  /** Canonical binding string using modifier+key syntax (e.g. `Ctrl+Shift+V`). */
  binding: string;
  /** Optional label override for displaying the binding. */
  display?: string;
  /** Whether the shortcut can be remapped by the user. */
  customizable?: boolean;
}

export interface ResolvedShortcut extends ShortcutDefinition {
  /** The active key combination after applying overrides. */
  keys: string;
  /** Formatted label that should be rendered to end users. */
  label: string;
}

/**
 * Canonical registry of desktop-level keyboard shortcuts. All other modules
 * should import definitions from here so the bindings stay in sync.
 */
export const GLOBAL_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'launcher.toggle',
    description: 'Toggle application launcher',
    category: 'Launcher',
    binding: 'Meta',
    display: 'Win',
  },
  {
    id: 'launcher.slot1',
    description: 'Open first dock item',
    category: 'Launcher',
    binding: 'Meta+Digit1',
    display: 'Win+1',
  },
  {
    id: 'launcher.slot2',
    description: 'Open second dock item',
    category: 'Launcher',
    binding: 'Meta+Digit2',
    display: 'Win+2',
  },
  {
    id: 'launcher.slot3',
    description: 'Open third dock item',
    category: 'Launcher',
    binding: 'Meta+Digit3',
    display: 'Win+3',
  },
  {
    id: 'launcher.slot4',
    description: 'Open fourth dock item',
    category: 'Launcher',
    binding: 'Meta+Digit4',
    display: 'Win+4',
  },
  {
    id: 'window.switcher.forward',
    description: 'Cycle windows forward',
    category: 'Window management',
    binding: 'Alt+Tab',
  },
  {
    id: 'window.switcher.backward',
    description: 'Cycle windows backward',
    category: 'Window management',
    binding: 'Shift+Alt+Tab',
  },
  {
    id: 'window.switcher.sameApp',
    description: 'Cycle windows of focused app',
    category: 'Window management',
    binding: 'Alt+Backquote',
    display: 'Alt+`',
  },
  {
    id: 'window.switcher.sameAppBackward',
    description: 'Cycle windows of focused app backward',
    category: 'Window management',
    binding: 'Shift+Alt+Backquote',
    display: 'Shift+Alt+`',
  },
  {
    id: 'window.snap.left',
    description: 'Snap focused window left',
    category: 'Window management',
    binding: 'Meta+ArrowLeft',
    display: 'Win+←',
  },
  {
    id: 'window.snap.right',
    description: 'Snap focused window right',
    category: 'Window management',
    binding: 'Meta+ArrowRight',
    display: 'Win+→',
  },
  {
    id: 'window.snap.up',
    description: 'Maximize focused window',
    category: 'Window management',
    binding: 'Meta+ArrowUp',
    display: 'Win+↑',
  },
  {
    id: 'window.snap.down',
    description: 'Restore/minimize focused window',
    category: 'Window management',
    binding: 'Meta+ArrowDown',
    display: 'Win+↓',
  },
  {
    id: 'utilities.clipboard',
    description: 'Open clipboard manager',
    category: 'Utilities',
    binding: 'Ctrl+Shift+V',
  },
  {
    id: 'system.settings',
    description: 'Open settings',
    category: 'System',
    binding: 'Ctrl+,',
    customizable: true,
  },
  {
    id: 'system.screenshot',
    description: 'Capture desktop screenshot',
    category: 'System',
    binding: 'PrintScreen',
  },
  {
    id: 'help.shortcuts',
    description: 'Show keyboard shortcuts',
    category: 'Help',
    binding: '?',
    customizable: true,
  },
];

const SHORTCUT_LOOKUP = new Map(GLOBAL_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));

const DISPLAY_TOKEN_MAP: Record<string, string> = {
  Alt: 'Alt',
  Ctrl: 'Ctrl',
  Meta: 'Win',
  Shift: 'Shift',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Backquote: '`',
  PrintScreen: 'Print Screen',
};

const isCharacterKey = (token: string) => token.length === 1;

const normaliseToken = (token: string) => {
  if (token.startsWith('Digit')) {
    return token.replace('Digit', '');
  }
  if (token.startsWith('Key')) {
    return token.replace('Key', '').toUpperCase();
  }
  return DISPLAY_TOKEN_MAP[token] || token;
};

const modifierOrder = ['Ctrl', 'Shift', 'Alt', 'Meta'] as const;

const parseBinding = (binding: string) => binding.split('+').filter(Boolean);

const extractKey = (tokens: string[]) => {
  const modifiers = new Set(modifierOrder);
  for (const token of tokens) {
    if (!modifiers.has(token as (typeof modifierOrder)[number])) {
      return token;
    }
  }
  // Modifier-only shortcut such as `Meta`
  return tokens[tokens.length - 1] || '';
};

export const formatShortcutLabel = (binding: string) => {
  const tokens = parseBinding(binding);
  if (tokens.length === 0) return '';
  const keyToken = extractKey(tokens);
  const formatted = tokens.map((token) => {
    if (token === keyToken) {
      if (keyToken === 'Meta' && tokens.length === 1) {
        return normaliseToken('Meta');
      }
      return normaliseToken(token);
    }
    return normaliseToken(token);
  });
  return formatted.join('+');
};

const modifierFlags: Record<string, keyof KeyboardEvent> = {
  Alt: 'altKey',
  Ctrl: 'ctrlKey',
  Meta: 'metaKey',
  Shift: 'shiftKey',
};

const normaliseEventKey = (event: KeyboardEvent) => {
  if (event.key.length === 1) {
    return event.key.toUpperCase();
  }
  return event.key;
};

const matchesKeyToken = (event: KeyboardEvent, token: string) => {
  if (token === 'Meta' && event.key === 'Meta') return true;
  if (token.startsWith('Digit')) {
    return event.code === token || event.key === token.replace('Digit', '');
  }
  if (token.startsWith('Key')) {
    return normaliseEventKey(event) === token.replace('Key', '').toUpperCase();
  }
  if (token === 'Backquote') {
    return event.code === 'Backquote' || event.key === '`' || event.key === '~';
  }
  if (isCharacterKey(token)) {
    return normaliseEventKey(event) === token.toUpperCase();
  }
  return normaliseEventKey(event) === token;
};

/**
 * Determine whether the provided keyboard event matches the given binding.
 */
export const matchesShortcut = (event: KeyboardEvent, binding: string) => {
  const tokens = parseBinding(binding);
  if (tokens.length === 0) return false;
  const requiredModifiers = new Set<string>();
  tokens.forEach((token) => {
    if (modifierFlags[token]) {
      requiredModifiers.add(token);
    }
  });

  for (const [token, flag] of Object.entries(modifierFlags)) {
    const required = requiredModifiers.has(token);
    if (event[flag] !== required) {
      return false;
    }
  }

  const keyToken = extractKey(tokens);
  return matchesKeyToken(event, keyToken);
};

/**
 * Resolve the shortcut bindings, applying any overrides.
 */
export const resolveShortcuts = (overrides?: Map<string, string>): ResolvedShortcut[] =>
  GLOBAL_SHORTCUTS.map((shortcut) => {
    const keys =
      shortcut.customizable && overrides?.get(shortcut.id)
        ? overrides.get(shortcut.id) || shortcut.binding
        : shortcut.binding;
    return {
      ...shortcut,
      keys,
      label: shortcut.display || formatShortcutLabel(keys),
    };
  });

export const useShortcuts = (overrides?: Map<string, string>) =>
  useMemo(() => resolveShortcuts(overrides), [overrides]);

export const getShortcutById = (id: string) => SHORTCUT_LOOKUP.get(id);

export const getShortcutBinding = (id: string): string | undefined => {
  const shortcut = SHORTCUT_LOOKUP.get(id);
  if (!shortcut) return undefined;
  if (!shortcut.customizable || typeof window === 'undefined') {
    return shortcut.binding;
  }
  try {
    const stored = window.localStorage.getItem('keymap');
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      const value = parsed?.[shortcut.description];
      if (typeof value === 'string') {
        return value;
      }
    }
  } catch {
    // ignore malformed storage values
  }
  return shortcut.binding;
};

export const groupShortcutsByCategory = (shortcuts: ResolvedShortcut[]) => {
  const groups = new Map<ShortcutCategory, ResolvedShortcut[]>();
  shortcuts.forEach((shortcut) => {
    const list = groups.get(shortcut.category) || [];
    list.push(shortcut);
    groups.set(shortcut.category, list);
  });
  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    items,
  }));
};
