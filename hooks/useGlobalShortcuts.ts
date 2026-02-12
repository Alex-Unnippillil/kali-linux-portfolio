import { DependencyList, useEffect, useMemo } from 'react';

export interface ShortcutDescriptor {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  allowRepeat?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: boolean;
  handler: (event: KeyboardEvent) => void;
}

const normalizeKey = (key: string): string => key.toLowerCase();

const matchesShortcut = (
  event: KeyboardEvent,
  shortcut: ShortcutDescriptor
): boolean => {
  if (normalizeKey(event.key) !== normalizeKey(shortcut.key)) {
    return false;
  }

  const expectsAlt = shortcut.altKey ?? false;
  const expectsCtrl = shortcut.ctrlKey ?? false;
  const expectsMeta = shortcut.metaKey ?? false;
  const expectsShift = shortcut.shiftKey ?? false;

  return (
    event.altKey === expectsAlt &&
    event.ctrlKey === expectsCtrl &&
    event.metaKey === expectsMeta &&
    event.shiftKey === expectsShift
  );
};

const isEnabled = (shortcut: ShortcutDescriptor): boolean =>
  shortcut.enabled !== false;

const toArray = (
  shortcuts: ShortcutDescriptor[] | ShortcutDescriptor
): ShortcutDescriptor[] =>
  Array.isArray(shortcuts) ? shortcuts : [shortcuts];

const serialize = (shortcut: ShortcutDescriptor): string =>
  [
    normalizeKey(shortcut.key),
    shortcut.altKey ? '1' : '0',
    shortcut.ctrlKey ? '1' : '0',
    shortcut.metaKey ? '1' : '0',
    shortcut.shiftKey ? '1' : '0',
    shortcut.allowRepeat ? '1' : '0',
  ].join('');

export const useGlobalShortcuts = (
  shortcuts: ShortcutDescriptor[] | ShortcutDescriptor,
  deps: DependencyList = []
): void => {
  const list = useMemo(() => toArray(shortcuts), [shortcuts]);
  const signature = useMemo(
    () => list.map(serialize).join('|'),
    [list]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!list.length) return;

    const handler = (event: KeyboardEvent) => {
      for (const shortcut of list) {
        if (!isEnabled(shortcut)) continue;
        if (!matchesShortcut(event, shortcut)) continue;
        if (!shortcut.allowRepeat && event.repeat) continue;

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        if (shortcut.stopPropagation) {
          event.stopPropagation();
        }
        shortcut.handler(event);
        break;
      }
    };

    window.addEventListener('keydown', handler, { passive: false });
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [list, signature, ...deps]);
};
