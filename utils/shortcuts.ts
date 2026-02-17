const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

interface ShortcutEventLike {
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  key?: string;
}

export const formatShortcutEvent = (event: ShortcutEventLike): string => {
  const key = event?.key ?? '';
  if (!key || MODIFIER_KEYS.has(key)) {
    return '';
  }

  const parts = [
    event?.ctrlKey ? 'Ctrl' : '',
    event?.altKey ? 'Alt' : '',
    event?.shiftKey ? 'Shift' : '',
    event?.metaKey ? 'Meta' : '',
  ].filter(Boolean);

  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;

  if (!normalizedKey || MODIFIER_KEYS.has(normalizedKey)) {
    return '';
  }

  return [...parts, normalizedKey].join('+');
};

export const isTypingTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tagName = element.tagName;
  return Boolean(tagName === 'INPUT' || tagName === 'TEXTAREA' || element.isContentEditable);
};
