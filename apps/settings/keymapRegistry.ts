import { useCallback, useEffect, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export type ShortcutId =
  | 'show-shortcuts'
  | 'open-settings'
  | 'open-clipboard-manager';

export interface ShortcutDefinition {
  id: ShortcutId;
  description: string;
  default: string;
}

export interface ShortcutBinding extends ShortcutDefinition {
  keys: string;
  isDefault: boolean;
  conflicts: ShortcutId[];
}

export interface KeymapConfig {
  version: number;
  overrides: Partial<Record<ShortcutId, string>>;
}

export interface ShortcutUpdateOutcome {
  keys: string;
  reverted: ShortcutId[];
}

export const KEYMAP_STORAGE_KEY = 'keymap';
export const KEYMAP_SCHEMA_VERSION = 1;

const MODIFIER_ORDER: ReadonlyArray<string> = ['Ctrl', 'Alt', 'Shift', 'Meta'];

const canonicalModifier = (value: string) => {
  const lower = value.toLowerCase();
  switch (lower) {
    case 'ctrl':
    case 'control':
      return 'Ctrl';
    case 'alt':
    case 'option':
      return 'Alt';
    case 'shift':
      return 'Shift';
    case 'meta':
    case 'cmd':
    case 'command':
      return 'Meta';
    default:
      return null;
  }
};

export const normalizeCombo = (combo: string): string => {
  const parts = combo
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  const modifiers = new Set<string>();
  let key: string | null = null;

  parts.forEach((part) => {
    const modifier = canonicalModifier(part);
    if (modifier) {
      modifiers.add(modifier);
      return;
    }
    if (part.length === 1) {
      key = part.toUpperCase();
    } else if (part.length > 1) {
      key = part[0].toUpperCase() + part.slice(1);
    }
  });

  const orderedModifiers = MODIFIER_ORDER.filter((modifier) =>
    modifiers.has(modifier)
  );

  if (key === '?' && orderedModifiers.includes('Shift')) {
    return [
      ...orderedModifiers.filter((modifier) => modifier !== 'Shift'),
      key,
    ]
      .filter(Boolean)
      .join('+');
  }

  return [...orderedModifiers, key].filter(Boolean).join('+');
};

export const keyboardEventToCombo = (event: KeyboardEvent): string => {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Meta');

  let key = event.key;
  if (key.length === 1) {
    key = key.toUpperCase();
  }

  if (key === '?' && parts.includes('Shift')) {
    parts.splice(parts.indexOf('Shift'), 1);
  }

  parts.push(key);
  return normalizeCombo(parts.join('+'));
};

const createDefinition = (
  id: ShortcutId,
  description: string,
  combo: string,
): ShortcutDefinition => ({
  id,
  description,
  default: normalizeCombo(combo),
});

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  createDefinition('show-shortcuts', 'Show keyboard shortcuts', '?'),
  createDefinition('open-settings', 'Open settings', 'Ctrl+,'),
  createDefinition(
    'open-clipboard-manager',
    'Open clipboard manager',
    'Ctrl+Shift+V',
  ),
];

const DEFINITIONS_BY_ID = new Map(
  SHORTCUT_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const getDefaultShortcut = (id: ShortcutId): string =>
  DEFINITIONS_BY_ID.get(id)?.default ?? '';

export const getShortcutDescription = (id: ShortcutId): string =>
  DEFINITIONS_BY_ID.get(id)?.description ?? id;

const createInitialConfig = (): KeymapConfig => ({
  version: KEYMAP_SCHEMA_VERSION,
  overrides: {},
});

const isKeymapConfig = (value: unknown): value is KeymapConfig => {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate = value as Partial<KeymapConfig>;
  if (candidate.version !== KEYMAP_SCHEMA_VERSION) return false;
  if (typeof candidate.overrides !== 'object' || candidate.overrides === null) {
    return false;
  }

  return Object.entries(candidate.overrides).every(([key, val]) => {
    return (
      DEFINITIONS_BY_ID.has(key as ShortcutId) && typeof val === 'string'
    );
  });
};

export const resolveKeymap = (
  config: KeymapConfig = createInitialConfig(),
): Record<ShortcutId, string> => {
  const overrides = config.overrides ?? {};
  return SHORTCUT_DEFINITIONS.reduce<Record<ShortcutId, string>>(
    (accumulator, definition) => {
      const override = overrides[definition.id];
      accumulator[definition.id] = override
        ? normalizeCombo(override)
        : definition.default;
      return accumulator;
    },
    {} as Record<ShortcutId, string>,
  );
};

export const getResolvedShortcutMap = (): Record<ShortcutId, string> => {
  if (typeof window === 'undefined') {
    return resolveKeymap(createInitialConfig());
  }

  try {
    const stored = window.localStorage.getItem(KEYMAP_STORAGE_KEY);
    if (!stored) return resolveKeymap(createInitialConfig());
    const parsed = JSON.parse(stored);
    if (!isKeymapConfig(parsed)) return resolveKeymap(createInitialConfig());
    return resolveKeymap(parsed);
  } catch {
    return resolveKeymap(createInitialConfig());
  }
};

export const computeShortcutBindings = (
  config: KeymapConfig,
): ShortcutBinding[] => {
  const resolved = resolveKeymap(config);
  const byCombo = new Map<string, ShortcutId[]>();

  SHORTCUT_DEFINITIONS.forEach((definition) => {
    const combo = resolved[definition.id];
    const list = byCombo.get(combo) ?? [];
    list.push(definition.id);
    byCombo.set(combo, list);
  });

  return SHORTCUT_DEFINITIONS.map((definition) => {
    const combo = resolved[definition.id];
    const conflicts = (byCombo.get(combo) ?? []).filter(
      (otherId) => otherId !== definition.id,
    );

    return {
      ...definition,
      keys: combo,
      isDefault: combo === definition.default,
      conflicts,
    };
  });
};

export const removeShortcutOverride = (
  config: KeymapConfig,
  id: ShortcutId,
): KeymapConfig => {
  if (!config.overrides[id]) return config;
  const overrides = { ...config.overrides };
  delete overrides[id];
  return { ...config, overrides };
};

export const applyShortcutUpdate = (
  config: KeymapConfig,
  id: ShortcutId,
  combo: string,
): [KeymapConfig, ShortcutUpdateOutcome] => {
  const normalized = normalizeCombo(combo);
  const overrides = { ...config.overrides };
  const resolved = resolveKeymap(config);

  const conflicts = (Object.entries(resolved) as [ShortcutId, string][]).filter(
    ([otherId, keys]) => otherId !== id && keys === normalized,
  );

  const reverted: ShortcutId[] = [];
  conflicts.forEach(([otherId]) => {
    if (overrides[otherId]) {
      delete overrides[otherId];
      reverted.push(otherId);
    }
  });

  if (normalized === getDefaultShortcut(id)) {
    delete overrides[id];
  } else {
    overrides[id] = normalized;
  }

  return [
    { ...config, overrides },
    {
      keys: normalized,
      reverted,
    },
  ];
};

export function useKeymap() {
  const [config, setConfig, resetConfig] = usePersistentState<KeymapConfig>(
    KEYMAP_STORAGE_KEY,
    createInitialConfig,
    isKeymapConfig,
  );

  const shortcuts = useMemo(() => computeShortcutBindings(config), [config]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detail = {
      map: resolveKeymap(config),
    };
    window.dispatchEvent(new CustomEvent('keymap-changed', { detail }));
  }, [config]);

  const updateShortcut = useCallback(
    (id: ShortcutId, combo: string) => {
      let outcome: ShortcutUpdateOutcome | null = null;
      setConfig((current) => {
        const [nextConfig, result] = applyShortcutUpdate(current, id, combo);
        outcome = result;
        return nextConfig;
      });
      return outcome ?? { keys: getDefaultShortcut(id), reverted: [] };
    },
    [setConfig],
  );

  const resetShortcut = useCallback(
    (id: ShortcutId) => {
      setConfig((current) => removeShortcutOverride(current, id));
    },
    [setConfig],
  );

  const resetAll = useCallback(() => {
    resetConfig();
  }, [resetConfig]);

  return { shortcuts, updateShortcut, resetShortcut, resetAll };
}

export default useKeymap;
