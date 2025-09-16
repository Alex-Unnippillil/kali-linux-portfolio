const MODIFIER_ALIASES: Record<string, string> = {
  control: 'ctrl',
  option: 'alt',
  cmd: 'meta',
  command: 'meta',
  super: 'meta',
  win: 'meta',
  windows: 'meta',
};

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta'] as const;
const MODIFIER_SET = new Set(MODIFIER_ORDER);

const KEY_ALIASES: Record<string, string> = {
  ' ': 'space',
  spacebar: 'space',
};

const normalizePart = (part: string): string => {
  const lower = part.trim().toLowerCase();
  if (!lower) return '';
  if (lower in MODIFIER_ALIASES) {
    return MODIFIER_ALIASES[lower];
  }
  if (lower in KEY_ALIASES) {
    return KEY_ALIASES[lower];
  }
  if (lower === 'control') {
    return 'ctrl';
  }
  return lower;
};

export const normalizeCombo = (combo: string): string | null => {
  if (!combo) return null;
  const parts = combo
    .split('+')
    .map(normalizePart)
    .filter(Boolean);
  if (!parts.length) return null;
  const modifiers: string[] = [];
  const keys: string[] = [];
  for (const part of parts) {
    if (MODIFIER_SET.has(part as typeof MODIFIER_ORDER[number])) {
      if (!modifiers.includes(part)) {
        modifiers.push(part);
      }
    } else {
      keys.push(part);
    }
  }
  if (!keys.length) return null;
  modifiers.sort(
    (a, b) =>
      MODIFIER_ORDER.indexOf(a as typeof MODIFIER_ORDER[number]) -
      MODIFIER_ORDER.indexOf(b as typeof MODIFIER_ORDER[number])
  );
  return [...modifiers, ...keys].join('+');
};

const normalizeKey = (key: string): string => {
  if (!key) return '';
  const lower = key.toLowerCase();
  if (lower in KEY_ALIASES) return KEY_ALIASES[lower];
  if (lower in MODIFIER_ALIASES) return MODIFIER_ALIASES[lower];
  if (lower === 'control') return 'ctrl';
  return lower;
};

const eventToCombo = (event: KeyboardEvent): string | null => {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  if (event.metaKey) parts.push('meta');
  const key = normalizeKey(event.key);
  if (!key || MODIFIER_SET.has(key as typeof MODIFIER_ORDER[number])) {
    return null;
  }
  parts.push(key);
  return parts.join('+');
};

export type KeybindingHandler = (event: KeyboardEvent) => void;

class KeybindingManager {
  private bindings = new Map<string, Set<KeybindingHandler>>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeydown, { passive: false });
    }
  }

  register(combo: string, handler: KeybindingHandler): () => void {
    const normalized = normalizeCombo(combo);
    if (!normalized) return () => {};
    let handlers = this.bindings.get(normalized);
    if (!handlers) {
      handlers = new Set();
      this.bindings.set(normalized, handlers);
    }
    handlers.add(handler);
    return () => this.unregister(combo, handler);
  }

  unregister(combo: string, handler: KeybindingHandler): void {
    const normalized = normalizeCombo(combo);
    if (!normalized) return;
    const handlers = this.bindings.get(normalized);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.bindings.delete(normalized);
    }
  }

  private emit(event: KeyboardEvent, combo: string): void {
    const handlers = this.bindings.get(combo);
    if (!handlers || handlers.size === 0) return;
    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Keybinding handler failed', error);
        }
      }
    });
  }

  private handleKeydown = (event: KeyboardEvent) => {
    const combo = eventToCombo(event);
    if (!combo) return;
    this.emit(event, combo);
  };
}

const keybindingManager = new KeybindingManager();

export default keybindingManager;
