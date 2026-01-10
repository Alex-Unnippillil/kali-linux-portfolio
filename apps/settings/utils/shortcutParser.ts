export const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;

type Modifier = (typeof MODIFIER_ORDER)[number];

const MODIFIER_ALIASES: Record<string, Modifier> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  option: 'Alt',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Meta',
  cmd: 'Meta',
  command: 'Meta',
  super: 'Meta',
  win: 'Meta',
};

const SPECIAL_KEYS: Record<string, string> = {
  '': '',
  ' ': 'Space',
  space: 'Space',
  escape: 'Escape',
  esc: 'Escape',
  enter: 'Enter',
  return: 'Enter',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  del: 'Delete',
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

const isModifier = (token: string): token is Modifier =>
  MODIFIER_ORDER.includes(token as Modifier);

const normalizePrimaryKey = (token: string | undefined): string => {
  if (!token) return '';
  const trimmed = token.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower in SPECIAL_KEYS) {
    return SPECIAL_KEYS[lower];
  }
  if (/^f\d{1,2}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (lower.startsWith('arrow')) {
    const direction = lower.slice('arrow'.length);
    if (direction) {
      return `Arrow${direction.charAt(0).toUpperCase()}${direction.slice(1)}`;
    }
  }
  if (trimmed.length === 1) {
    return trimmed.toUpperCase();
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const normalizeToken = (token: string): Modifier | string => {
  const trimmed = token.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower in MODIFIER_ALIASES) {
    return MODIFIER_ALIASES[lower];
  }
  if (isModifier(trimmed as Modifier)) {
    return trimmed as Modifier;
  }
  return normalizePrimaryKey(trimmed);
};

export const normalizeShortcutTokens = (tokens: string[]): string => {
  const modifierSet = new Set<Modifier>();
  let primary = '';

  tokens.forEach((token) => {
    const normalized = normalizeToken(token);
    if (!normalized) return;
    if (isModifier(normalized)) {
      modifierSet.add(normalized);
      return;
    }
    primary = normalized;
  });

  const parts = MODIFIER_ORDER.filter((modifier) => modifierSet.has(modifier));
  if (primary) {
    parts.push(primary);
  }
  return parts.join('+');
};

export const normalizeShortcutString = (value: string): string => {
  if (!value) return '';
  const tokens = value
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean);
  return normalizeShortcutTokens(tokens);
};

export const keyboardEventToShortcut = (event: KeyboardEvent): string => {
  const tokens: string[] = [];
  if (event.ctrlKey) tokens.push('Ctrl');
  if (event.altKey) tokens.push('Alt');
  if (event.shiftKey) tokens.push('Shift');
  if (event.metaKey) tokens.push('Meta');

  const key = event.key;
  const modifierKey = key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta';

  if (!modifierKey || tokens.length === 0) {
    tokens.push(key);
  }

  const combo = normalizeShortcutTokens(tokens);
  return combo;
};

export default keyboardEventToShortcut;
