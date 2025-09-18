"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ShortcutHint, { ShortcutHintPayload } from '../components/ui/ShortcutHint';
import useKeymap from '../apps/settings/keymapRegistry';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import {
  SHORTCUT_HINT_COOLDOWN_MS,
  ShortcutHintSettings,
  getShortcutHintSettings,
  isShortcutHintSuppressed,
  onShortcutHintSettingsChange,
  shortcutHintDefaults,
  startShortcutHintCooldown,
} from '../utils/settings/shortcutHints';
import { logEvent } from '../utils/analytics';

interface ShortcutTelemetryContextValue {
  trackPointerAction: (action: string, target?: HTMLElement | null) => void;
  registerKeyboardAction: (action: string) => void;
  dismissHint: () => void;
  hintsDisabled: boolean;
}

const ShortcutTelemetryContext = createContext<ShortcutTelemetryContextValue>({
  trackPointerAction: () => {},
  registerKeyboardAction: () => {},
  dismissHint: () => {},
  hintsDisabled: false,
});

const POINTER_REPEAT_THRESHOLD = 3;
const SHIFT_REQUIRED = /[A-Z~!@#$%^&*()_+{}|:"<>?]/;

const shouldIgnoreTarget = (target: EventTarget | null): boolean => {
  if (!target || typeof (target as Element).tagName !== 'string') return false;
  const element = target as HTMLElement;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    element.isContentEditable ||
    element.getAttribute('role') === 'textbox'
  );
};

const parseDuration = (value: string): number => {
  if (!value) return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith('ms')) {
    const num = parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(num) ? num : 0;
  }
  if (trimmed.endsWith('s')) {
    const num = parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(num) ? num * 1000 : 0;
  }
  const num = parseFloat(trimmed);
  return Number.isFinite(num) ? num : 0;
};

const normaliseModifier = (token: string): 'ctrl' | 'alt' | 'shift' | 'meta' | null => {
  switch (token.toLowerCase()) {
    case 'ctrl':
    case 'control':
      return 'ctrl';
    case 'alt':
    case 'option':
      return 'alt';
    case 'shift':
      return 'shift';
    case 'meta':
    case 'cmd':
    case 'command':
    case 'super':
      return 'meta';
    default:
      return null;
  }
};

const matchesShortcut = (event: KeyboardEvent, shortcut: string): boolean => {
  if (!shortcut) return false;
  const parts = shortcut.split('+').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return false;

  let expectedKey: string | null = null;
  let expectedCtrl = false;
  let expectedAlt = false;
  let expectedShift = false;
  let expectedMeta = false;

  for (const part of parts) {
    const modifier = normaliseModifier(part);
    if (modifier) {
      if (modifier === 'ctrl') expectedCtrl = true;
      if (modifier === 'alt') expectedAlt = true;
      if (modifier === 'shift') expectedShift = true;
      if (modifier === 'meta') expectedMeta = true;
    } else {
      expectedKey = part;
    }
  }

  if (event.ctrlKey !== expectedCtrl) return false;
  if (event.altKey !== expectedAlt) return false;
  if (event.metaKey !== expectedMeta) return false;

  const key = event.key.length === 1 ? event.key : event.key.toLowerCase();
  const expected = expectedKey ? expectedKey : '';
  if (expected && key.toLowerCase() !== expected.toLowerCase()) return false;

  if (expectedShift) {
    return event.shiftKey;
  }

  const requiresShift = expected ? SHIFT_REQUIRED.test(expected) : false;
  if (!requiresShift && event.shiftKey) return false;

  if (requiresShift && !event.shiftKey) return false;

  return true;
};

interface ShortcutTelemetryProviderProps {
  children: ReactNode;
}

export const ShortcutTelemetryProvider = ({ children }: ShortcutTelemetryProviderProps) => {
  const { shortcuts } = useKeymap();
  const reducedMotion = usePrefersReducedMotion();

  const [hint, setHint] = useState<ShortcutHintPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const [settings, setSettingsState] = useState<ShortcutHintSettings>(shortcutHintDefaults);

  const settingsRef = useRef(settings);
  const pointerCountsRef = useRef(new Map<string, number>());
  const actionMapRef = useRef(new Map<string, string>());
  const lastHintActionRef = useRef<string | null>(null);
  const mediumDurationRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const map = new Map<string, string>();
    shortcuts.forEach((shortcut) => {
      if (shortcut.description && shortcut.keys) {
        map.set(shortcut.description, shortcut.keys);
      }
    });
    actionMapRef.current = map;
  }, [shortcuts]);

  const computeMediumDuration = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    const style = getComputedStyle(document.documentElement);
    const value = style.getPropertyValue('--motion-medium');
    const ms = parseDuration(value);
    mediumDurationRef.current = ms;
    return ms;
  }, []);

  useEffect(() => {
    computeMediumDuration();
  }, [computeMediumDuration, reducedMotion]);

  useEffect(() => {
    let cancelled = false;
    getShortcutHintSettings().then((value) => {
      if (!cancelled) {
        setSettingsState(value);
        settingsRef.current = value;
      }
    });
    const unsubscribe = onShortcutHintSettingsChange((value) => {
      setSettingsState(value);
      settingsRef.current = value;
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (settings.disabled) {
      pointerCountsRef.current.clear();
      lastHintActionRef.current = null;
    }
  }, [settings.disabled]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
    };
  }, []);

  const showHint = useCallback(
    (action: string, keys: string, target: HTMLElement | null, pointerCount: number) => {
      const now = Date.now();
      const updatedSettings: ShortcutHintSettings = {
        ...settingsRef.current,
        suppressedUntil: now + SHORTCUT_HINT_COOLDOWN_MS,
      };
      settingsRef.current = updatedSettings;
      setSettingsState(updatedSettings);
      startShortcutHintCooldown().catch(() => {});

      setHint({ action, description: action, keys, target });
      setVisible(true);
      pointerCountsRef.current.set(action, 0);
      lastHintActionRef.current = action;

      logEvent({
        category: 'shortcut-hints',
        action: 'hint_shown',
        label: `${action} – ${keys}`,
        value: pointerCount,
      });

      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);

      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
      }, 2000);

      const duration = computeMediumDuration();
      cleanupTimerRef.current = window.setTimeout(() => {
        setHint(null);
      }, 2000 + duration);
    },
    [computeMediumDuration],
  );

  const recordPointerAction = useCallback(
    (action: string, target?: HTMLElement | null) => {
      if (!action) return;
      const keys = actionMapRef.current.get(action);
      if (!keys) return;
      if (isShortcutHintSuppressed(settingsRef.current)) return;

      const counts = pointerCountsRef.current;
      const next = (counts.get(action) || 0) + 1;
      counts.set(action, next);
      if (next < POINTER_REPEAT_THRESHOLD) return;

      showHint(action, keys, target ?? null, next);
    },
    [showHint],
  );

  const recordPointerRef = useRef(recordPointerAction);
  useEffect(() => {
    recordPointerRef.current = recordPointerAction;
  }, [recordPointerAction]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handler = (event: MouseEvent) => {
      const original = event.target as HTMLElement | null;
      if (!original) return;
      const element = original.closest<HTMLElement>('[data-shortcut-action]');
      if (!element) return;
      const expected = (element.dataset.shortcutEvent || 'click').toLowerCase();
      if (expected !== event.type) return;
      if (event.type === 'click' && event.detail === 0) return;
      const action = element.dataset.shortcutAction;
      if (!action) return;
      recordPointerRef.current(action, element);
    };
    document.addEventListener('click', handler);
    document.addEventListener('dblclick', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('dblclick', handler);
    };
  }, []);

  const registerKeyboardAction = useCallback((action: string) => {
    const keys = actionMapRef.current.get(action);
    if (!keys) return;
    pointerCountsRef.current.set(action, 0);
    if (lastHintActionRef.current === action) {
      lastHintActionRef.current = null;
      logEvent({
        category: 'shortcut-hints',
        action: 'adopted',
        label: `${action} – ${keys}`,
      });
    }
  }, []);

  const registerKeyboardRef = useRef(registerKeyboardAction);
  useEffect(() => {
    registerKeyboardRef.current = registerKeyboardAction;
  }, [registerKeyboardAction]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: KeyboardEvent) => {
      if (shouldIgnoreTarget(event.target)) return;
      const map = actionMapRef.current;
      const keys = map.get('Open settings');
      if (!keys) return;
      if (!matchesShortcut(event, keys)) return;
      event.preventDefault();
      registerKeyboardRef.current('Open settings');
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'settings' }));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const dismissHint = useCallback(() => {
    if (!hint) return;
    setVisible(false);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
    const duration = mediumDurationRef.current || computeMediumDuration();
    cleanupTimerRef.current = window.setTimeout(() => setHint(null), duration);
  }, [computeMediumDuration, hint]);

  const contextValue = useMemo(
    () => ({
      trackPointerAction: recordPointerAction,
      registerKeyboardAction,
      dismissHint,
      hintsDisabled: settings.disabled,
    }),
    [recordPointerAction, registerKeyboardAction, dismissHint, settings.disabled],
  );

  return (
    <ShortcutTelemetryContext.Provider value={contextValue}>
      {children}
      <ShortcutHint hint={hint} visible={visible} />
    </ShortcutTelemetryContext.Provider>
  );
};

export const useShortcutTelemetry = (): ShortcutTelemetryContextValue => {
  return useContext(ShortcutTelemetryContext);
};
