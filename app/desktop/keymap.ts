const MODIFIER_ALIASES: Record<string, keyof ModifierState> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  shift: 'shift',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  super: 'meta',
  win: 'meta',
  windows: 'meta',
};

type ModifierState = {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
};

const KEY_ALIASES: Record<string, string> = {
  ' ': 'space',
  space: 'space',
  spacebar: 'space',
  esc: 'escape',
  escape: 'escape',
  return: 'enter',
  enter: 'enter',
  tab: 'tab',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  pageup: 'pageup',
  pagedown: 'pagedown',
  del: 'delete',
  delete: 'delete',
  backspace: 'backspace',
  ins: 'insert',
  insert: 'insert',
  home: 'home',
  end: 'end',
  plus: '+',
  add: '+',
  minus: '-',
  subtract: '-',
  comma: ',',
  period: '.',
  dot: '.',
  semicolon: ';',
  colon: ':',
  apostrophe: "'",
  quote: "'",
  backquote: '`',
  backtick: '`',
  tilde: '~',
  capslock: 'capslock',
  numlock: 'numlock',
  scrolllock: 'scrolllock',
  prtsc: 'printscreen',
  prtscr: 'printscreen',
  printscreen: 'printscreen',
  pause: 'pause',
  break: 'pause',
};

type ShortcutHandler = (event: KeyboardEvent) => void;

type ParsedCombo = ModifierState & { key: string };

const handlers = new Map<string, Set<ShortcutHandler>>();

let listener: ((event: KeyboardEvent) => void) | null = null;
let attachmentCount = 0;

function normalizeKeyName(input: string): string {
  const lower = input.length === 1 ? input.toLowerCase() : input.toLowerCase();
  return KEY_ALIASES[lower] ?? lower;
}

function parseCombo(combo: string): ParsedCombo {
  if (typeof combo !== 'string') {
    throw new Error('Keyboard shortcut must be a string.');
  }
  const raw = combo.trim();
  if (!raw) {
    throw new Error('Keyboard shortcut cannot be empty.');
  }
  const parts = raw
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new Error(`Keyboard shortcut "${combo}" is invalid.`);
  }

  const state: ParsedCombo = { ctrl: false, alt: false, shift: false, meta: false, key: '' };

  for (const part of parts) {
    const lower = part.toLowerCase();
    const modifier = MODIFIER_ALIASES[lower];
    if (modifier) {
      state[modifier] = true;
      continue;
    }

    const keyName = normalizeKeyName(part);
    if (!state.key) {
      state.key = keyName;
      continue;
    }

    if (state.key !== keyName) {
      throw new Error(
        `Keyboard shortcut "${combo}" has multiple key entries ("${state.key}" and "${keyName}").`
      );
    }
  }

  if (!state.key) {
    throw new Error(`Keyboard shortcut "${combo}" must include a non-modifier key.`);
  }

  return state;
}

function canonicalise({ ctrl, alt, shift, meta, key }: ParsedCombo): string {
  const parts: string[] = [];
  if (ctrl) parts.push('ctrl');
  if (alt) parts.push('alt');
  if (shift) parts.push('shift');
  if (meta) parts.push('meta');
  parts.push(key);
  return parts.join('+');
}

function canonicaliseCombo(combo: string): string {
  return canonicalise(parseCombo(combo));
}

function canonicaliseEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  if (event.metaKey) parts.push('meta');
  parts.push(normalizeKeyName(event.key));
  return parts.join('+');
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target) return false;

  if (target instanceof Element) {
    const element = target as HTMLElement;
    const tag = element.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }
    if (element.isContentEditable) {
      return true;
    }
    if (element.closest('[contenteditable="true"]')) {
      return true;
    }
    return false;
  }

  if (target instanceof Node) {
    return isEditableTarget(target.parentElement);
  }

  return false;
}

function ensureListener() {
  if (listener || typeof window === 'undefined') {
    return;
  }

  listener = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (isEditableTarget(event.target)) return;

    const key = canonicaliseEvent(event);
    const callbacks = handlers.get(key);
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    for (const callback of Array.from(callbacks)) {
      callback(event);
    }
  };
}

export function register(combo: string, handler: ShortcutHandler): () => void {
  const key = canonicaliseCombo(combo);
  let set = handlers.get(key);
  if (!set) {
    set = new Set();
    handlers.set(key, set);
  }
  set.add(handler);
  return () => {
    const current = handlers.get(key);
    if (!current) {
      return;
    }
    current.delete(handler);
    if (current.size === 0) {
      handlers.delete(key);
    }
  };
}

export function attach(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  ensureListener();
  if (!listener) {
    return () => {};
  }

  attachmentCount += 1;
  if (attachmentCount === 1) {
    window.addEventListener('keydown', listener);
  }

  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    attachmentCount = Math.max(attachmentCount - 1, 0);
    if (attachmentCount === 0 && listener) {
      window.removeEventListener('keydown', listener);
    }
  };
}
