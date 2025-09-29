"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import layout from "../../nethunter/osk/layout.json";
import { useSettings } from "../../hooks/useSettings";

type ModifierKey = "Shift" | "Control" | "Alt" | "Meta";

type KeyBehavior = "toggle" | "momentary";

type KeyType = "char" | "modifier" | "action" | "function";

interface LayoutKey {
  label: string;
  code: string;
  key?: string;
  shiftValue?: string;
  ariaLabel?: string;
  width?: number;
  type: KeyType;
  modifier?: ModifierKey;
  behavior?: KeyBehavior;
}

interface KeyboardLayout {
  rows: LayoutKey[][];
}

interface OnScreenKeyboardContextValue {
  visible: boolean;
  manualVisible: boolean;
  autoVisible: boolean;
  hardwareKeyboardDetected: boolean;
  requestShow: () => void;
  requestHide: () => void;
}

const OnScreenKeyboardContext = createContext<OnScreenKeyboardContextValue | null>(
  null,
);

type DispatchResult = {
  prevented: boolean;
  element: HTMLElement | null;
};

type KeyboardEventType = "keydown" | "keyup";

const TEXT_INPUT_EXCLUDE = new Set([
  "button",
  "submit",
  "reset",
  "color",
  "file",
  "image",
  "checkbox",
  "radio",
  "range",
  "hidden",
]);

const detectHardwareKeyboard = () => {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return true;
  }
  const hasTouch = navigator.maxTouchPoints > 0;
  const noHover = window.matchMedia?.("(any-hover: none)").matches ?? false;
  if (hasTouch && noHover) {
    return false;
  }
  return true;
};

const qualifiesForKeyboard = (target: HTMLElement | null) => {
  if (!target) return false;
  if (target.closest("[data-osk-surface]")) return false;
  if (target.closest("[data-osk-toggle]") || target.hasAttribute("data-osk-toggle")) {
    return false;
  }
  if (target.closest("[data-osk-target]")) return true;
  if (target.hasAttribute("contenteditable") && target.getAttribute("contenteditable") !== "false") {
    return true;
  }
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }
  if (target instanceof HTMLInputElement) {
    if (target.readOnly || target.disabled) return false;
    if (TEXT_INPUT_EXCLUDE.has(target.type)) return false;
    return true;
  }
  const role = target.getAttribute("role");
  if (role && ["textbox", "searchbox", "combobox"].includes(role)) {
    return true;
  }
  return false;
};

const insertText = (element: HTMLElement, text: string) => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const nextValue = `${element.value.slice(0, start)}${text}${element.value.slice(end)}`;
    element.value = nextValue;
    const cursor = start + text.length;
    element.selectionStart = cursor;
    element.selectionEnd = cursor;
    element.dispatchEvent(
      new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }),
    );
    return;
  }
  if (element.isContentEditable) {
    document.execCommand("insertText", false, text);
  }
};

const deleteText = (element: HTMLElement) => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    if (start === end && start > 0) {
      const nextValue = `${element.value.slice(0, start - 1)}${element.value.slice(end)}`;
      element.value = nextValue;
      const cursor = start - 1;
      element.selectionStart = cursor;
      element.selectionEnd = cursor;
    } else if (start !== end) {
      const nextValue = `${element.value.slice(0, start)}${element.value.slice(end)}`;
      element.value = nextValue;
      element.selectionStart = start;
      element.selectionEnd = start;
    }
    element.dispatchEvent(
      new InputEvent("input", { bubbles: true, data: "", inputType: "deleteContentBackward" }),
    );
    return;
  }
  if (element.isContentEditable) {
    document.execCommand("delete");
  }
};

const computeKeyValue = (key: LayoutKey, modifiers: Set<ModifierKey>) => {
  if (key.type === "char") {
    if (modifiers.has("Shift") && key.shiftValue) {
      return key.shiftValue;
    }
    if (key.key && key.key.length === 1) {
      return key.key;
    }
    return key.key ?? key.label;
  }
  if (key.code === "Space") {
    return " ";
  }
  return key.key ?? key.label;
};

export const useOnScreenKeyboard = () => {
  const ctx = useContext(OnScreenKeyboardContext);
  if (!ctx) {
    throw new Error("useOnScreenKeyboard must be used within OnScreenKeyboardProvider");
  }
  return ctx;
};

export function OnScreenKeyboardProvider({ children }: { children: ReactNode }) {
  const { onScreenKeyboardEnabled, onScreenKeyboardAutoShow } = useSettings();
  const [manualVisible, setManualVisible] = useState(false);
  const [autoVisible, setAutoVisible] = useState(false);
  const [hardwareKeyboardDetected, setHardwareKeyboardDetected] = useState(
    detectHardwareKeyboard,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeModifiersRef = useRef<Set<ModifierKey>>(new Set());
  const latchedModifiersRef = useRef<Set<ModifierKey>>(new Set());
  const modifierSourceRef = useRef<Map<ModifierKey, LayoutKey>>(new Map());
  const [, forceModifierRender] = useState(0);

  const layoutData = layout as KeyboardLayout;

  const allowAutoShow =
    onScreenKeyboardEnabled && onScreenKeyboardAutoShow && !hardwareKeyboardDetected;

  const visible = onScreenKeyboardEnabled && (manualVisible || (allowAutoShow && autoVisible));

  useEffect(() => {
    if (!onScreenKeyboardEnabled) {
      setManualVisible(false);
      setAutoVisible(false);
    }
  }, [onScreenKeyboardEnabled]);

  useEffect(() => {
    if (!allowAutoShow) {
      setAutoVisible(false);
    }
  }, [allowAutoShow]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.isTrusted) {
        setHardwareKeyboardDetected(true);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-osk-surface]")) return;
      if (!onScreenKeyboardEnabled) return;
      if (allowAutoShow && qualifiesForKeyboard(target)) {
        setAutoVisible(true);
      } else if (!manualVisible) {
        setAutoVisible(false);
      }
    };
    document.addEventListener("focusin", handleFocusIn, true);
    return () => document.removeEventListener("focusin", handleFocusIn, true);
  }, [allowAutoShow, manualVisible, onScreenKeyboardEnabled]);

  useEffect(() => {
    if (!visible) {
      document.documentElement.classList.remove("osk-visible");
      document.documentElement.style.setProperty("--osk-viewport-offset", "0px");
      window.dispatchEvent(
        new CustomEvent("oskchange", { detail: { visible: false, height: 0 } }),
      );
      return;
    }
    document.documentElement.classList.add("osk-visible");
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const height = element.offsetHeight;
      document.documentElement.style.setProperty(
        "--osk-viewport-offset",
        `${height}px`,
      );
      window.dispatchEvent(
        new CustomEvent("oskchange", { detail: { visible: true, height } }),
      );
    };
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [visible]);

  const dispatchKeyEvent = useCallback(
    (type: KeyboardEventType, keyDef: LayoutKey): DispatchResult => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (!activeElement) return { prevented: false, element: null };
      const modifiers = activeModifiersRef.current;
      const keyValue = computeKeyValue(keyDef, modifiers);
      const event = new KeyboardEvent(type, {
        key: keyValue,
        code: keyDef.code,
        bubbles: true,
        cancelable: true,
        shiftKey: modifiers.has("Shift"),
        ctrlKey: modifiers.has("Control"),
        altKey: modifiers.has("Alt"),
        metaKey: modifiers.has("Meta"),
      });
      const prevented = !activeElement.dispatchEvent(event);
      return { prevented, element: activeElement };
    },
    [],
  );

  const releaseMomentaryModifiers = useCallback(() => {
    const latched = latchedModifiersRef.current;
    if (!latched.size) return;
    latched.forEach((modifier) => {
      const source = modifierSourceRef.current.get(modifier);
      if (!source) return;
      activeModifiersRef.current.delete(modifier);
      dispatchKeyEvent("keyup", source);
      modifierSourceRef.current.delete(modifier);
    });
    latched.clear();
    forceModifierRender((v) => v + 1);
  }, [dispatchKeyEvent]);

  const toggleModifier = useCallback(
    (keyDef: LayoutKey) => {
      if (!keyDef.modifier) return;
      const modifier = keyDef.modifier;
      const isActive = activeModifiersRef.current.has(modifier);
      if (isActive) {
        activeModifiersRef.current.delete(modifier);
        latchedModifiersRef.current.delete(modifier);
        modifierSourceRef.current.delete(modifier);
        dispatchKeyEvent("keyup", keyDef);
      } else {
        activeModifiersRef.current.add(modifier);
        modifierSourceRef.current.set(modifier, keyDef);
        if (keyDef.behavior === "momentary") {
          latchedModifiersRef.current.add(modifier);
        }
        dispatchKeyEvent("keydown", keyDef);
      }
      forceModifierRender((v) => v + 1);
    },
    [dispatchKeyEvent],
  );

  const handleKey = useCallback(
    (keyDef: LayoutKey) => {
      if (keyDef.type === "modifier") {
        toggleModifier(keyDef);
        return;
      }
      const { prevented, element } = dispatchKeyEvent("keydown", keyDef);
      if (!prevented && element) {
        if (keyDef.code === "Backspace") {
          deleteText(element);
        } else if (keyDef.type === "char" || keyDef.code === "Space") {
          const text = computeKeyValue(keyDef, activeModifiersRef.current);
          insertText(element, text);
        } else if (keyDef.code === "Enter") {
          if (element instanceof HTMLTextAreaElement || element.isContentEditable) {
            insertText(element, "\n");
          }
        }
      }
      dispatchKeyEvent("keyup", keyDef);
      releaseMomentaryModifiers();
    },
    [dispatchKeyEvent, releaseMomentaryModifiers, toggleModifier],
  );

  const manualButtonLabel = manualVisible ? "Hide Keyboard" : "Show Keyboard";

  const contextValue = useMemo<OnScreenKeyboardContextValue>(
    () => ({
      visible,
      manualVisible,
      autoVisible: allowAutoShow && autoVisible,
      hardwareKeyboardDetected,
      requestShow: () => setManualVisible(true),
      requestHide: () => setManualVisible(false),
    }),
    [allowAutoShow, autoVisible, hardwareKeyboardDetected, manualVisible, visible],
  );

  return (
    <OnScreenKeyboardContext.Provider value={contextValue}>
      {children}
      {onScreenKeyboardEnabled && (
        <button
          type="button"
          data-osk-toggle
          className="fixed right-4 z-50 rounded-full border border-ubt-cool-grey bg-gray-900/80 px-4 py-2 text-sm font-medium text-gray-100 shadow-lg backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
          style={{ bottom: "calc(var(--osk-viewport-offset, 0px) + 1rem)" }}
          onClick={() => setManualVisible((value) => !value)}
          aria-pressed={manualVisible}
          aria-label="Toggle on-screen keyboard"
        >
          {manualButtonLabel}
        </button>
      )}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pb-3"
        aria-hidden={!visible}
      >
        <div
          ref={containerRef}
          data-osk-surface
          className={`mx-auto max-w-6xl rounded-2xl border border-ubt-cool-grey bg-gray-950/95 p-3 shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${
            visible ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-8"
          }`}
        >
          <div className="space-y-2">
            {layoutData.rows.map((row, rowIndex) => (
              <div key={`osk-row-${rowIndex}`} className="flex gap-2">
                {row.map((keyDef) => {
                  const width = keyDef.width ?? 1;
                  const isActive =
                    keyDef.type === "modifier" &&
                    keyDef.modifier &&
                    activeModifiersRef.current.has(keyDef.modifier);
                  return (
                    <button
                      key={`${keyDef.code}-${keyDef.label}`}
                      type="button"
                      tabIndex={-1}
                      className={`flex select-none items-center justify-center rounded-md border border-ubt-cool-grey bg-gray-900/90 px-2 py-2 text-sm font-medium uppercase tracking-wide text-gray-100 shadow-inner transition-colors duration-150 focus:outline-none ${
                        isActive ? "border-ub-orange bg-ub-orange/80 text-black" : "hover:bg-gray-800/70"
                      }`}
                      style={{ flex: width, minWidth: `${width * 2.25}rem` }}
                      aria-label={keyDef.ariaLabel ?? keyDef.label}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        handleKey(keyDef);
                      }}
                    >
                      {keyDef.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </OnScreenKeyboardContext.Provider>
  );
}
