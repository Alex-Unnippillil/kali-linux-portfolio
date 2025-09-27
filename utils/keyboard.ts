export const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;

type Modifier = (typeof MODIFIER_ORDER)[number];

const modifierLookup: Record<string, Modifier> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  meta: 'Meta',
  cmd: 'Meta',
  command: 'Meta',
  super: 'Meta',
  win: 'Meta',
  windows: 'Meta',
};

const isLetterOrNumber = (key: string) => /[A-Z0-9]/i.test(key);

const normalizeKey = (key: string) => {
  if (!key) return '';
  if (key === ' ') return 'Space';
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
};

export const normalizeShortcut = (input: string): string => {
  if (!input) return '';
  const parts = input
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  const modifiers: Modifier[] = [];
  let keyPart: string | null = null;

  parts.forEach((part) => {
    const mapped = modifierLookup[part.toLowerCase()];
    if (mapped) {
      if (!modifiers.includes(mapped)) {
        modifiers.push(mapped);
      }
      return;
    }

    const normalized = normalizeKey(part);
    if (!normalized) return;
    keyPart = normalized;
  });

  if (keyPart === 'Meta') {
    const index = modifiers.indexOf('Meta');
    if (index !== -1) modifiers.splice(index, 1);
  }

  if (
    keyPart &&
    keyPart.length === 1 &&
    !isLetterOrNumber(keyPart) &&
    modifiers.includes('Shift')
  ) {
    modifiers.splice(modifiers.indexOf('Shift'), 1);
  }

  const ordered = modifiers.sort(
    (a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b)
  );

  return keyPart ? [...ordered, keyPart].join('+') : ordered.join('+');
};

export const formatKeyboardEvent = (event: KeyboardEvent): string => {
  const modifiers: Modifier[] = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Meta');

  let key = event.key;
  if (key === 'Unidentified') key = '';
  if (key === ' ') key = 'Space';
  if (key.length === 1) key = key.toUpperCase();

  if (key === 'Meta') {
    const index = modifiers.indexOf('Meta');
    if (index !== -1) modifiers.splice(index, 1);
  }

  if (
    key.length === 1 &&
    !isLetterOrNumber(key) &&
    modifiers.includes('Shift')
  ) {
    modifiers.splice(modifiers.indexOf('Shift'), 1);
  }

  const ordered = modifiers.sort(
    (a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b)
  );

  if (!key || key === 'Control' || key === 'Shift' || key === 'Alt') {
    if (key === 'Control') return 'Ctrl';
    if (key === 'Alt') return 'Alt';
    return key || ordered.join('+');
  }

  return key ? [...ordered, key].join('+') : ordered.join('+');
};

export const shortcutMatchesEvent = (
  shortcut: string,
  event: KeyboardEvent
): boolean => {
  if (!shortcut) return false;
  return normalizeShortcut(shortcut) === formatKeyboardEvent(event);
};
