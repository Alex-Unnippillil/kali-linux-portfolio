import { useEffect } from 'react';

type Direction = 1 | -1;

type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

const META_KEYS = new Set([
  'Meta',
  'MetaLeft',
  'MetaRight',
  'OS',
  'OSLeft',
  'OSRight',
]);

const isMetaKey = (key: string): boolean => META_KEYS.has(key);

export type ShortcutAction =
  | 'alt-tab'
  | 'alt-backtick'
  | 'ctrl-backtick'
  | 'win-key'
  | 'meta-arrow'
  | 'clipboard';

export interface ShortcutBeforeHandleDetail {
  action: ShortcutAction;
  originalEvent: KeyboardEvent;
  direction?: Direction;
  key?: ArrowKey;
}

export interface ShortcutCallbacks {
  onAltTab?: (direction: Direction, event: KeyboardEvent) => void;
  onAltBacktick?: (direction: Direction, event: KeyboardEvent) => void;
  onCtrlBacktick?: (direction: Direction, event: KeyboardEvent) => void;
  onWinKey?: (event: KeyboardEvent) => void;
  onMetaArrow?: (key: ArrowKey, event: KeyboardEvent) => void;
  onClipboard?: (event: KeyboardEvent) => void;
}

interface ShortcutToggleDetail {
  enabled: boolean;
  token?: string;
}

const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
  'date',
  'datetime-local',
  'time',
  'month',
  'week',
]);

const isEditableElement = (element: HTMLElement | null): boolean => {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element.isContentEditable) return true;
  if (element instanceof HTMLInputElement) {
    const type = (element.getAttribute('type') || 'text').toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
  }
  return false;
};

class GlobalShortcutManager {
  private subscribers = new Set<ShortcutCallbacks>();
  private disableTokens = new Set<string>();
  private editableTarget: HTMLElement | null = null;
  private metaPressed = false;
  private metaUsed = false;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('keyup', this.handleKeyUp, true);
    if (typeof document !== 'undefined') {
      document.addEventListener('focusin', this.handleFocusIn, true);
      document.addEventListener('focusout', this.handleFocusOut, true);
    }
    window.addEventListener(
      'global-shortcuts:toggle',
      this.handleToggle as EventListener,
    );
  }

  subscribe(callbacks: ShortcutCallbacks): () => void {
    this.subscribers.add(callbacks);
    return () => {
      this.subscribers.delete(callbacks);
    };
  }

  disable(token = 'manual') {
    this.disableTokens.add(token);
  }

  enable(token = 'manual') {
    this.disableTokens.delete(token);
  }

  private get disabled(): boolean {
    return this.disableTokens.size > 0;
  }

  private handleFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      this.editableTarget = null;
      return;
    }
    if (target.closest('[data-allow-global-shortcuts="true"]')) {
      this.editableTarget = null;
      return;
    }
    if (isEditableElement(target)) {
      this.editableTarget = target;
    } else {
      this.editableTarget = null;
    }
  };

  private handleFocusOut = (event: FocusEvent) => {
    if (event.target === this.editableTarget) {
      this.editableTarget = null;
    }
  };

  private handleToggle = (event: CustomEvent<ShortcutToggleDetail>) => {
    const detail = event.detail;
    if (!detail) return;
    const token = detail.token ?? 'manual';
    if (detail.enabled === false) {
      this.disableTokens.add(token);
    } else if (detail.enabled === true) {
      this.disableTokens.delete(token);
    }
  };

  private shouldHandle(
    action: ShortcutAction,
    event: KeyboardEvent,
    extra?: { direction?: Direction; key?: ArrowKey },
  ): boolean {
    if (this.disabled) return false;
    if (event.defaultPrevented || event.isComposing) return false;
    if (
      this.editableTarget &&
      action !== 'alt-tab' &&
      action !== 'win-key'
    ) {
      return false;
    }

    const detail: ShortcutBeforeHandleDetail = {
      action,
      originalEvent: event,
      ...extra,
    };
    const beforeEvent = new CustomEvent<ShortcutBeforeHandleDetail>(
      'global-shortcuts:before-handle',
      {
        detail,
        cancelable: true,
      },
    );
    window.dispatchEvent(beforeEvent);
    if (beforeEvent.defaultPrevented) return false;

    return true;
  }

  private notifyAltTab(direction: Direction, event: KeyboardEvent) {
    for (const subscriber of this.subscribers) {
      subscriber.onAltTab?.(direction, event);
    }
  }

  private notifyAltBacktick(direction: Direction, event: KeyboardEvent) {
    for (const subscriber of this.subscribers) {
      subscriber.onAltBacktick?.(direction, event);
    }
  }

  private notifyCtrlBacktick(direction: Direction, event: KeyboardEvent) {
    for (const subscriber of this.subscribers) {
      subscriber.onCtrlBacktick?.(direction, event);
    }
  }

  private notifyWinKey(event: KeyboardEvent) {
    for (const subscriber of this.subscribers) {
      subscriber.onWinKey?.(event);
    }
  }

  private notifyMetaArrow(key: ArrowKey, event: KeyboardEvent) {
    for (const subscriber of this.subscribers) {
      subscriber.onMetaArrow?.(key, event);
    }
  }

  private notifyClipboard(event: KeyboardEvent) {
    for (const subscriber of this.subscribers) {
      subscriber.onClipboard?.(event);
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const { key } = event;

    if (isMetaKey(key)) {
      this.metaPressed = true;
      this.metaUsed = false;
      return;
    }

    if (event.metaKey) {
      this.metaUsed = true;
      if (
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'ArrowUp' ||
        key === 'ArrowDown'
      ) {
        if (this.shouldHandle('meta-arrow', event, { key })) {
          event.preventDefault();
          this.notifyMetaArrow(key as ArrowKey, event);
        }
        return;
      }
    }

    if (event.altKey && key === 'Tab') {
      const direction: Direction = event.shiftKey ? -1 : 1;
      if (this.shouldHandle('alt-tab', event, { direction })) {
        event.preventDefault();
        this.notifyAltTab(direction, event);
      }
      return;
    }

    if (event.altKey && (key === '`' || key === '~')) {
      const direction: Direction = event.shiftKey ? -1 : 1;
      if (this.shouldHandle('alt-backtick', event, { direction })) {
        event.preventDefault();
        this.notifyAltBacktick(direction, event);
      }
      return;
    }

    if (event.ctrlKey && (key === '`' || key === '~')) {
      const direction: Direction = event.shiftKey ? -1 : 1;
      if (this.shouldHandle('ctrl-backtick', event, { direction })) {
        event.preventDefault();
        this.notifyCtrlBacktick(direction, event);
      }
      return;
    }

    if (event.ctrlKey && event.shiftKey && key.toLowerCase() === 'v') {
      if (this.shouldHandle('clipboard', event)) {
        event.preventDefault();
        this.notifyClipboard(event);
      }
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (isMetaKey(event.key)) {
      if (!this.metaUsed && this.shouldHandle('win-key', event)) {
        event.preventDefault();
        this.notifyWinKey(event);
      }
      this.metaPressed = false;
      this.metaUsed = false;
    }
  };
}

export const globalShortcutManager = new GlobalShortcutManager();

export const disableGlobalShortcuts = (token?: string) =>
  globalShortcutManager.disable(token);
export const enableGlobalShortcuts = (token?: string) =>
  globalShortcutManager.enable(token);

export function useGlobalShortcuts(callbacks: ShortcutCallbacks) {
  useEffect(() => {
    const unsubscribe = globalShortcutManager.subscribe(callbacks);
    return unsubscribe;
  }, [callbacks]);
}
