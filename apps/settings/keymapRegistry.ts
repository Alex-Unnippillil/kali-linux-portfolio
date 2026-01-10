import { useCallback, useEffect, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export type ShortcutScope = 'global' | 'contextual';

export interface ShortcutDefinition {
  id: string;
  description: string;
  defaultKeys: string;
  context: string;
  scope: ShortcutScope;
}

export interface ResolvedShortcut extends ShortcutDefinition {
  keys: string;
  conflictIds: string[];
  isOverride: boolean;
}

export interface ShortcutGroup {
  context: string;
  shortcuts: ResolvedShortcut[];
}

export const SHORTCUT_IDS = {
  showOverlay: 'shortcutOverlay.toggle',
  openSettings: 'settings.open',
  openClipboardManager: 'clipboard.open',
  openWindowSwitcher: 'window.switcher',
  cycleAppWindows: 'window.cycle',
  snapLeft: 'window.snapLeft',
  snapRight: 'window.snapRight',
  snapUp: 'window.snapUp',
  snapDown: 'window.snapDown',
  terminalNewTab: 'terminal.newTab',
  terminalCloseTab: 'terminal.closeTab',
  terminalNextTab: 'terminal.nextTab',
  terminalPrevTab: 'terminal.prevTab',
  gameHelpOverlay: 'games.helpOverlay',
} as const;

export const SHORTCUT_REGISTRY: ShortcutDefinition[] = [
  {
    id: SHORTCUT_IDS.showOverlay,
    description: 'Show keyboard shortcuts',
    defaultKeys: '?',
    context: 'Global',
    scope: 'global',
  },
  {
    id: SHORTCUT_IDS.openSettings,
    description: 'Open settings',
    defaultKeys: 'Ctrl+,',
    context: 'Global',
    scope: 'global',
  },
  {
    id: SHORTCUT_IDS.openClipboardManager,
    description: 'Open clipboard manager',
    defaultKeys: 'Ctrl+Shift+V',
    context: 'Global',
    scope: 'global',
  },
  {
    id: SHORTCUT_IDS.openWindowSwitcher,
    description: 'Open window switcher',
    defaultKeys: 'Alt+Tab',
    context: 'Desktop & window management',
    scope: 'global',
  },
  {
    id: SHORTCUT_IDS.cycleAppWindows,
    description: 'Cycle windows of focused app',
    defaultKeys: 'Alt+~',
    context: 'Desktop & window management',
    scope: 'contextual',
  },
  {
    id: SHORTCUT_IDS.snapLeft,
    description: 'Snap window to the left',
    defaultKeys: 'Meta+ArrowLeft',
    context: 'Desktop & window management',
    scope: 'global',
  },
  {
    id: SHORTCUT_IDS.snapRight,
    description: 'Snap window to the right',
    defaultKeys: 'Meta+ArrowRight',
    context: 'Desktop & window management',
    scope: 'global',
  },
  {
    id: SHORTCUT_IDS.snapUp,
    description: 'Snap window to the top',
    defaultKeys: 'Meta+ArrowUp',
    context: 'Desktop & window management',
    scope: 'global',
  },
  {
    id: SHORTCUT_IDS.snapDown,
    description: 'Snap window to the bottom',
    defaultKeys: 'Meta+ArrowDown',
    context: 'Desktop & window management',
    scope: 'global',
  },
  {
    id: SHORTCUT_IDS.terminalNewTab,
    description: 'Open a new terminal tab',
    defaultKeys: 'Ctrl+T',
    context: 'Terminal tabs',
    scope: 'contextual',
  },
  {
    id: SHORTCUT_IDS.terminalCloseTab,
    description: 'Close current terminal tab',
    defaultKeys: 'Ctrl+W',
    context: 'Terminal tabs',
    scope: 'contextual',
  },
  {
    id: SHORTCUT_IDS.terminalNextTab,
    description: 'Switch to next terminal tab',
    defaultKeys: 'Ctrl+Tab',
    context: 'Terminal tabs',
    scope: 'contextual',
  },
  {
    id: SHORTCUT_IDS.terminalPrevTab,
    description: 'Switch to previous terminal tab',
    defaultKeys: 'Ctrl+Shift+Tab',
    context: 'Terminal tabs',
    scope: 'contextual',
  },
  {
    id: SHORTCUT_IDS.gameHelpOverlay,
    description: 'Toggle in-game help overlay',
    defaultKeys: '?',
    context: 'Games',
    scope: 'contextual',
  },
];

const DEFAULT_MAP = SHORTCUT_REGISTRY.reduce<Record<string, string>>(
  (acc, shortcut) => {
    acc[shortcut.id] = shortcut.defaultKeys;
    return acc;
  },
  {}
);

const DESCRIPTION_TO_ID = new Map(
  SHORTCUT_REGISTRY.map((shortcut) => [shortcut.description, shortcut.id])
);

const CONTEXT_ORDER = [
  'Global',
  'Desktop & window management',
  'Terminal tabs',
  'Games',
];

const validator = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === 'string'
  );

const sortGroups = (groups: ShortcutGroup[]) =>
  groups.sort((a, b) => {
    const aIndex = CONTEXT_ORDER.indexOf(a.context);
    const bIndex = CONTEXT_ORDER.indexOf(b.context);
    if (aIndex === -1 && bIndex === -1) {
      return a.context.localeCompare(b.context);
    }
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

const buildConflictMap = (shortcuts: ShortcutDefinition[], overrides: Record<string, string>) => {
  const resolved = shortcuts.map((shortcut) => {
    const legacyKey = overrides[shortcut.description];
    const idKey = overrides[shortcut.id];
    const keys = idKey ?? legacyKey ?? shortcut.defaultKeys;
    return { ...shortcut, keys };
  });

  const conflicts = new Map<string, string[]>();
  const buckets = new Map<string, (ShortcutDefinition & { keys: string })[]>();

  resolved.forEach((shortcut) => {
    const normalized = shortcut.keys.trim();
    if (!normalized) return;
    const list = buckets.get(normalized) ?? [];
    list.push(shortcut);
    buckets.set(normalized, list);
  });

  buckets.forEach((entries) => {
    if (entries.length < 2) return;
    entries.forEach((shortcut) => {
      const conflicting = entries
        .filter((other) => {
          if (other.id === shortcut.id) return false;
          if (shortcut.scope === 'global' || other.scope === 'global') return true;
          return shortcut.context === other.context;
        })
        .map((other) => other.id);
      if (conflicting.length) {
        conflicts.set(shortcut.id, conflicting);
      }
    });
  });

  return conflicts;
};

export function useKeymap() {
  const [stored, setStored, resetStored] = usePersistentState<Record<string, string>>(
    'keymap',
    DEFAULT_MAP,
    validator
  );

  useEffect(() => {
    setStored((prev) => {
      const next: Record<string, string> = { ...prev };
      let changed = false;

      SHORTCUT_REGISTRY.forEach((shortcut) => {
        if (!(shortcut.id in next)) {
          next[shortcut.id] = shortcut.defaultKeys;
          changed = true;
        }
      });

      Object.entries(next).forEach(([key, value]) => {
        const mappedId = DESCRIPTION_TO_ID.get(key);
        if (!mappedId) return;
        next[mappedId] = value;
        if (key !== mappedId) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [setStored]);

  const conflicts = useMemo(
    () => buildConflictMap(SHORTCUT_REGISTRY, stored),
    [stored]
  );

  const shortcuts = useMemo<ResolvedShortcut[]>(() => {
    return SHORTCUT_REGISTRY.map((shortcut) => {
      const legacyKey = stored[shortcut.description];
      const override = stored[shortcut.id] ?? legacyKey;
      const keys = override ?? shortcut.defaultKeys;
      const isOverride = override !== undefined && override !== shortcut.defaultKeys;
      return {
        ...shortcut,
        keys,
        conflictIds: conflicts.get(shortcut.id) ?? [],
        isOverride,
      };
    });
  }, [conflicts, stored]);

  const groups = useMemo<ShortcutGroup[]>(() => {
    const grouped = new Map<string, ResolvedShortcut[]>();
    shortcuts.forEach((shortcut) => {
      const collection = grouped.get(shortcut.context) ?? [];
      collection.push(shortcut);
      grouped.set(shortcut.context, collection);
    });

    const result = Array.from(grouped.entries()).map(([context, items]) => ({
      context,
      shortcuts: items.sort((a, b) => a.description.localeCompare(b.description)),
    }));

    return sortGroups(result);
  }, [shortcuts]);

  const updateShortcut = useCallback(
    (id: string, keys: string) => {
      setStored((prev) => {
        const next = { ...prev, [id]: keys };
        const description = SHORTCUT_REGISTRY.find((shortcut) => shortcut.id === id)?.description;
        if (description && description in next) {
          delete next[description];
        }
        return next;
      });
    },
    [setStored]
  );

  const resetShortcuts = useCallback(() => {
    resetStored();
  }, [resetStored]);

  return {
    shortcuts,
    groups,
    updateShortcut,
    resetShortcuts,
  };
}

export default useKeymap;
