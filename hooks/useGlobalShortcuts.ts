import { useEffect, useRef } from 'react';

export type GlobalShortcutType =
  | 'altTab'
  | 'ctrlBacktick'
  | 'metaKey'
  | 'metaArrow'
  | 'clipboard';

export interface GlobalShortcutEventDetail {
  type: GlobalShortcutType;
  event: KeyboardEvent;
  direction?: 1 | -1;
  key?: string;
}

export type GlobalShortcutHandler = (
  detail: GlobalShortcutEventDetail,
) => void;

export interface GlobalShortcutHandlers {
  onAltTab?: GlobalShortcutHandler;
  onCtrlBacktick?: GlobalShortcutHandler;
  onMetaKey?: GlobalShortcutHandler;
  onMetaArrow?: GlobalShortcutHandler;
  onClipboard?: GlobalShortcutHandler;
}

export interface GlobalShortcutOptions {
  /**
   * Optional guard that can disable the shortcut manager entirely while it
   * returns `false`.
   */
  isEnabled?: () => boolean;
}

export const GLOBAL_SHORTCUT_BEFORE_EVENT =
  'global-shortcuts:before-handle';

const ALLOW_ATTR = 'data-allow-global-shortcuts';
const DISABLE_ATTR = 'data-disable-global-shortcuts';
const INTERACTIVE_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"], [role="searchbox"]';
const TEXT_INPUT_TYPES = new Set([
  'color',
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
]);

function isEditableInput(element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  if (element.closest(`[${DISABLE_ATTR}]`)) {
    return true;
  }

  if (element.closest(`[${ALLOW_ATTR}="true"]`)) {
    return false;
  }

  if (element.matches(INTERACTIVE_SELECTOR)) {
    return true;
  }

  if (element.isContentEditable) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    if (element.disabled || element.readOnly) {
      return false;
    }
    if (TEXT_INPUT_TYPES.has(element.type)) {
      return true;
    }
    if (!element.type || element.type === 'text') {
      return true;
    }
  }

  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  return false;
}

function shouldIgnoreEvent(event: KeyboardEvent, options: GlobalShortcutOptions) {
  if (event.defaultPrevented) {
    return true;
  }

  if (options.isEnabled && !options.isEnabled()) {
    return true;
  }

  const target = event.target as Element | null;
  if (isEditableInput(target)) {
    return true;
  }

  const active =
    typeof document !== 'undefined'
      ? (document.activeElement as Element | null)
      : null;
  if (active && active !== target && isEditableInput(active)) {
    return true;
  }

  return false;
}

interface MatchedShortcut {
  type: GlobalShortcutType;
  direction?: 1 | -1;
  key?: string;
  preventDefault?: boolean;
}

function matchShortcut(event: KeyboardEvent): MatchedShortcut | null {
  if (event.metaKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    return {
      type: 'metaArrow',
      key: event.key,
    };
  }

  if (event.altKey && !event.metaKey && !event.ctrlKey && event.key === 'Tab') {
    return {
      type: 'altTab',
      direction: event.shiftKey ? -1 : 1,
    };
  }

  if (
    event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    (event.code === 'Backquote' || event.key === '`' || event.key === '~')
  ) {
    return {
      type: 'ctrlBacktick',
      direction: event.shiftKey ? -1 : 1,
    };
  }

  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') {
    return {
      type: 'clipboard',
    };
  }

  if (
    event.key === 'Meta' &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat
  ) {
    return {
      type: 'metaKey',
      preventDefault: true,
    };
  }

  return null;
}

function getHandler(
  handlers: GlobalShortcutHandlers,
  type: GlobalShortcutType,
): GlobalShortcutHandler | undefined {
  switch (type) {
    case 'altTab':
      return handlers.onAltTab;
    case 'ctrlBacktick':
      return handlers.onCtrlBacktick;
    case 'metaKey':
      return handlers.onMetaKey;
    case 'metaArrow':
      return handlers.onMetaArrow;
    case 'clipboard':
      return handlers.onClipboard;
    default:
      return undefined;
  }
}

export function useGlobalShortcuts(
  handlers: GlobalShortcutHandlers,
  options: GlobalShortcutOptions = {},
) {
  const handlersRef = useRef(handlers);
  const optionsRef = useRef(options);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const opts = optionsRef.current;
      if (shouldIgnoreEvent(event, opts)) {
        return;
      }

      const match = matchShortcut(event);
      if (!match) {
        return;
      }

      const handler = getHandler(handlersRef.current, match.type);
      if (!handler) {
        return;
      }

      const detail: GlobalShortcutEventDetail = {
        type: match.type,
        event,
        direction: match.direction,
        key: match.key,
      };

      const vetoable = new CustomEvent<GlobalShortcutEventDetail>(
        GLOBAL_SHORTCUT_BEFORE_EVENT,
        {
          detail,
          cancelable: true,
        },
      );

      const proceed = typeof window !== 'undefined' ? window.dispatchEvent(vetoable) : true;
      if (!proceed) {
        return;
      }

      handler(detail);

      if (match.preventDefault !== false) {
        event.preventDefault();
      }
    };

    if (typeof window === 'undefined') {
      return undefined;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

