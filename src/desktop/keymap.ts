const MODIFIER_ORDER = [
  { prop: 'altKey' as const, label: 'Alt', normalized: 'alt', aliases: ['alt', 'option'] },
  { prop: 'ctrlKey' as const, label: 'Ctrl', normalized: 'ctrl', aliases: ['ctrl', 'control'] },
  { prop: 'shiftKey' as const, label: 'Shift', normalized: 'shift', aliases: ['shift'] },
  { prop: 'metaKey' as const, label: 'Meta', normalized: 'meta', aliases: ['meta', 'cmd', 'command', 'super', 'win'] },
];

export type KeyCombo = string;
export type KeymapHandler = (event: KeyboardEvent) => void;

export interface RegisterOptions {
  /**
   * When true, the shortcut will fire even if the focused element is an input, textarea,
   * or content editable region. Defaults to false so typing in fields is unaffected.
   */
  allowInInput?: boolean;
}

interface RegisteredEntry {
  handler: KeymapHandler;
  allowInInput: boolean;
}

const registry = new Map<string, Set<RegisteredEntry>>();

const DEFAULT_OPTIONS: Required<RegisterOptions> = {
  allowInInput: false,
};

function normalizeKeyForMatch(key: string): string {
  if (!key) return '';
  if (key === ' ') return 'space';
  if (key.length === 1) return key.toUpperCase();
  return key.toLowerCase();
}

function normalizeCombo(combo: string): string {
  if (!combo) return '';
  const parts = combo
    .split('+')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const modifiers = new Set<string>();
  let key: string | null = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    const modifier = MODIFIER_ORDER.find((m) => m.aliases.includes(lower));
    if (modifier) {
      modifiers.add(modifier.normalized);
      continue;
    }

    if (key === null) {
      key = part;
    } else {
      key += `+${part}`;
    }
  }

  const normalizedKey = normalizeKeyForMatch(key ?? '');
  const ordered: string[] = [];
  for (const modifier of MODIFIER_ORDER) {
    if (modifiers.has(modifier.normalized)) {
      ordered.push(modifier.normalized);
    }
  }
  if (normalizedKey) {
    ordered.push(normalizedKey);
  }
  return ordered.join('+');
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target) return false;
  if (target instanceof HTMLElement) {
    const tag = target.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      target.isContentEditable
    );
  }
  return false;
}

function eventToNormalized(event: KeyboardEvent): string {
  const parts: string[] = [];
  for (const modifier of MODIFIER_ORDER) {
    if (event[modifier.prop]) {
      parts.push(modifier.normalized);
    }
  }
  const key = normalizeKeyForMatch(event.key);
  if (key) parts.push(key);
  return parts.join('+');
}

function normalizeKeyForDisplay(key: string): string {
  if (!key) return '';
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function eventToCombo(event: KeyboardEvent): string {
  const parts: string[] = [];
  for (const modifier of MODIFIER_ORDER) {
    if (event[modifier.prop]) {
      parts.push(modifier.label);
    }
  }
  const key = normalizeKeyForDisplay(event.key);
  if (key) parts.push(key);
  return parts.join('+');
}

export function register(
  combo: KeyCombo,
  handler: KeymapHandler,
  options: RegisterOptions = {}
): () => void {
  const normalized = normalizeCombo(combo);
  if (!normalized || typeof handler !== 'function') {
    return () => {};
  }

  const entry: RegisteredEntry = {
    handler,
    allowInInput: options.allowInInput ?? DEFAULT_OPTIONS.allowInInput,
  };

  const bucket = registry.get(normalized);
  if (bucket) {
    bucket.add(entry);
  } else {
    registry.set(normalized, new Set([entry]));
  }

  return () => {
    const current = registry.get(normalized);
    if (!current) return;
    current.delete(entry);
    if (current.size === 0) {
      registry.delete(normalized);
    }
  };
}

export function attach(
  target: EventTarget | null =
    typeof window !== 'undefined' ? (window as unknown as EventTarget) : null
): () => void {
  if (!target || !target.addEventListener || !target.removeEventListener) {
    return () => {};
  }

  const listener = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    const normalized = eventToNormalized(event);
    const entries = registry.get(normalized);
    if (!entries || entries.size === 0) return;

    const editable = isEditableTarget(event.target);
    let handled = false;

    for (const entry of entries) {
      if (editable && !entry.allowInInput) {
        continue;
      }
      if (!handled) {
        event.preventDefault();
        handled = true;
      }
      entry.handler(event);
    }
  };

  target.addEventListener('keydown', listener as EventListener);

  return () => {
    target.removeEventListener('keydown', listener as EventListener);
  };
}

export const __testing = {
  normalizeCombo,
  eventToNormalized,
  registry,
};
