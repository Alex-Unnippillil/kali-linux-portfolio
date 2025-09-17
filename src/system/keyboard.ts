type ModifierKey = "Shift" | "Control" | "Alt" | "Meta";

export type { ModifierKey };

export interface ModifierLatchState {
  enabled: boolean;
  latched: ModifierKey[];
}

type StickyChangeListener = (state: ModifierLatchState) => void;

const SHIFTED_KEY_MAP: Record<string, string> = {
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
  "-": "_",
  "=": "+",
  "[": "{",
  "]": "}",
  "\\": "|",
  ";": ":",
  "'": '"',
  ",": "<",
  ".": ">",
  "/": "?",
  "`": "~",
};

const KEY_TO_MODIFIER: Record<string, ModifierKey> = {
  Shift: "Shift",
  Control: "Control",
  Ctrl: "Control",
  Alt: "Alt",
  AltGraph: "Alt",
  Meta: "Meta",
  OS: "Meta",
  Super: "Meta",
};

const CODE_TO_MODIFIER: Record<string, ModifierKey> = {
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  ControlLeft: "Control",
  ControlRight: "Control",
  AltLeft: "Alt",
  AltRight: "Alt",
  MetaLeft: "Meta",
  MetaRight: "Meta",
};

const normalizeModifierKey = (input: string): ModifierKey | null => {
  return KEY_TO_MODIFIER[input] ?? CODE_TO_MODIFIER[input] ?? null;
};

const getModifierFromEvent = (event: KeyboardEvent): ModifierKey | null => {
  return normalizeModifierKey(event.key) ?? normalizeModifierKey(event.code);
};

const overrideBooleanProperty = (
  event: KeyboardEvent,
  key: "shiftKey" | "ctrlKey" | "altKey" | "metaKey",
  value: boolean,
) => {
  try {
    Object.defineProperty(event, key, {
      configurable: true,
      enumerable: true,
      value,
    });
  } catch {
    try {
      Object.defineProperty(event, key, {
        configurable: true,
        enumerable: true,
        get: () => value,
      });
    } catch {
      // Swallow errors on platforms where KeyboardEvent props are immutable.
    }
  }
};

const overrideKey = (event: KeyboardEvent, value: string) => {
  try {
    Object.defineProperty(event, "key", {
      configurable: true,
      enumerable: true,
      value,
    });
  } catch {
    try {
      Object.defineProperty(event, "key", {
        configurable: true,
        enumerable: true,
        get: () => value,
      });
    } catch {
      /* ignore */
    }
  }
};

const computeShiftedKey = (key: string): string | null => {
  if (key.length !== 1) return null;
  if (SHIFTED_KEY_MAP[key] !== undefined) {
    return SHIFTED_KEY_MAP[key];
  }
  const upper = key.toUpperCase();
  if (upper !== key) {
    return upper;
  }
  return null;
};

class KeyboardSystem {
  private stickyEnabled = false;
  private latched = new Set<ModifierKey>();
  private held = new Set<ModifierKey>();
  private usedDuringHold = new Map<ModifierKey, boolean>();
  private resetAfterNextKey = false;
  private listeners = new Set<StickyChangeListener>();

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    window.addEventListener("keydown", this.handleKeyDown, true);
    window.addEventListener("keyup", this.handleKeyUp, true);
    window.addEventListener("blur", this.handleWindowBlur);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  subscribe(listener: StickyChangeListener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setStickyModifiersEnabled(enabled: boolean) {
    if (this.stickyEnabled === enabled) return;
    this.stickyEnabled = enabled;
    if (!enabled) {
      this.latched.clear();
      this.held.clear();
      this.usedDuringHold.clear();
      this.resetAfterNextKey = false;
    }
    this.emitChange();
  }

  isLatched(modifier: ModifierKey) {
    return this.latched.has(modifier);
  }

  getState(): ModifierLatchState {
    return this.snapshot();
  }

  reset() {
    if (
      this.latched.size === 0 &&
      this.held.size === 0 &&
      !this.resetAfterNextKey
    ) {
      this.usedDuringHold.clear();
      return;
    }
    this.latched.clear();
    this.held.clear();
    this.usedDuringHold.clear();
    this.resetAfterNextKey = false;
    this.emitChange();
  }

  private handleKeyDown(event: KeyboardEvent) {
    const modifier = getModifierFromEvent(event);
    if (modifier) {
      if (event.repeat) return;
      this.held.add(modifier);
      this.usedDuringHold.set(modifier, false);
      return;
    }

    if (!this.stickyEnabled || this.latched.size === 0) {
      return;
    }

    const originalShift = event.shiftKey;
    const originalCtrl = event.ctrlKey;
    const originalAlt = event.altKey;
    const originalMeta = event.metaKey;

    if (this.latched.has("Shift") && !originalShift) {
      overrideBooleanProperty(event, "shiftKey", true);
    }
    if (this.latched.has("Control") && !originalCtrl) {
      overrideBooleanProperty(event, "ctrlKey", true);
    }
    if (this.latched.has("Alt") && !originalAlt) {
      overrideBooleanProperty(event, "altKey", true);
    }
    if (this.latched.has("Meta") && !originalMeta) {
      overrideBooleanProperty(event, "metaKey", true);
    }

    const originalGetModifierState = event.getModifierState
      ? event.getModifierState.bind(event)
      : undefined;
    event.getModifierState = (key: string) => {
      const normalized = normalizeModifierKey(key);
      if (normalized && this.latched.has(normalized)) {
        return true;
      }
      return originalGetModifierState ? originalGetModifierState(key) : false;
    };

    if (this.latched.has("Shift") && !originalShift) {
      const shiftedKey = computeShiftedKey(event.key);
      if (shiftedKey) {
        overrideKey(event, shiftedKey);
      }
    }

    if (this.held.size > 0) {
      this.held.forEach((mod) => {
        this.usedDuringHold.set(mod, true);
      });
    }

    this.resetAfterNextKey = true;
  }

  private handleKeyUp(event: KeyboardEvent) {
    const modifier = getModifierFromEvent(event);
    if (!modifier) {
      if (this.resetAfterNextKey) {
        this.resetAfterNextKey = false;
        if (this.latched.size > 0) {
          this.latched.clear();
          this.emitChange();
        }
      }
      return;
    }

    if (event.repeat) return;

    this.held.delete(modifier);
    const used = this.usedDuringHold.get(modifier);
    this.usedDuringHold.delete(modifier);

    if (!this.stickyEnabled) {
      return;
    }

    if (used) {
      return;
    }

    if (this.latched.has(modifier)) {
      this.latched.delete(modifier);
    } else {
      this.latched.add(modifier);
    }
    this.emitChange();
  }

  private handleWindowBlur() {
    this.reset();
  }

  private handleVisibilityChange() {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") {
      this.reset();
    }
  }

  private emitChange() {
    if (this.listeners.size === 0) return;
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private snapshot(): ModifierLatchState {
    return {
      enabled: this.stickyEnabled,
      latched: Array.from(this.latched),
    };
  }
}

type KeyboardSystemWithMarker = KeyboardSystem & { __isStickyManager?: true };

let instance: KeyboardSystem | null = null;

const ensureKeyboard = (): KeyboardSystem | null => {
  if (instance) return instance;
  if (typeof window === "undefined") return null;
  const global = window as typeof window & {
    __stickyKeyboard?: KeyboardSystemWithMarker;
  };
  if (global.__stickyKeyboard) {
    instance = global.__stickyKeyboard;
    return instance;
  }
  instance = new KeyboardSystem();
  global.__stickyKeyboard = instance as KeyboardSystemWithMarker;
  return instance;
};

export const setStickyModifiersEnabled = (enabled: boolean) => {
  const keyboard = ensureKeyboard();
  keyboard?.setStickyModifiersEnabled(enabled);
};

export const resetStickyModifiers = () => {
  const keyboard = ensureKeyboard();
  keyboard?.reset();
};

export const isModifierLatched = (modifier: ModifierKey): boolean => {
  const keyboard = ensureKeyboard();
  return keyboard?.isLatched(modifier) ?? false;
};

export const getStickyModifierState = (): ModifierLatchState => {
  const keyboard = ensureKeyboard();
  return keyboard?.getState() ?? { enabled: false, latched: [] };
};

export const subscribeStickyModifierChanges = (
  listener: StickyChangeListener,
): (() => void) => {
  const keyboard = ensureKeyboard();
  if (!keyboard) {
    return () => {};
  }
  return keyboard.subscribe(listener);
};

