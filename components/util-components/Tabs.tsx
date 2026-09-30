"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type PropsWithChildren,
  type ReactNode,
} from "react";

type Orientation = "horizontal" | "vertical";

type TabsValue = string;

interface TabsRootProps {
  /**
   * Controlled value of the active tab.
   */
  value?: TabsValue;
  /**
   * Initial value when uncontrolled. If omitted, the first registered tab is used.
   */
  defaultValue?: TabsValue;
  /**
   * Called whenever the active tab changes.
   */
  onValueChange?: (value: TabsValue) => void;
  /**
   * Whether tabs use manual activation (Enter/Space) or automatic activation on focus.
   */
  manualActivation?: boolean;
  /**
   * Orientation for keyboard navigation.
   */
  orientation?: Orientation;
  children: ReactNode;
}

interface TabsListProps extends PropsWithChildren {
  id?: string;
  className?: string;
}

interface TabsTriggerProps extends PropsWithChildren {
  value: TabsValue;
  disabled?: boolean;
  className?: string;
}

interface TabsPanelProps extends PropsWithChildren {
  value: TabsValue;
  className?: string;
  id?: string;
}

interface RegisteredTab {
  value: TabsValue;
  ref: MutableRefObject<HTMLButtonElement | null>;
}

interface TabsContextValue {
  activeValue: TabsValue | null;
  focusValue: TabsValue | null;
  manualActivation: boolean;
  orientation: Orientation;
  baseId: string;
  registerTab: (tab: RegisteredTab) => () => void;
  setActiveValue: (value: TabsValue) => void;
  setFocusValue: (value: TabsValue | null, options?: { shouldFocus?: boolean }) => void;
  getOrderedTabs: () => RegisteredTab[];
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useControllableState(
  value: TabsValue | undefined,
  defaultValue: TabsValue | undefined,
) {
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<TabsValue | null>(
    defaultValue ?? null,
  );

  const state = isControlled ? value ?? null : uncontrolled;

  const setState = useCallback(
    (next: TabsValue | null) => {
      if (!isControlled) {
        setUncontrolled(next);
      }
    },
    [isControlled],
  );

  return [state, setState, isControlled] as const;
}

function useTabsInternal(
  props: TabsRootProps,
): TabsContextValue {
  const {
    value,
    defaultValue,
    onValueChange,
    manualActivation = false,
    orientation = "horizontal",
  } = props;

  const [activeValue, setActiveState, isControlled] = useControllableState(
    value,
    defaultValue,
  );
  const [focusValue, setFocus] = useState<TabsValue | null>(null);

  const tabs = useRef<RegisteredTab[]>([]);

  const setActiveValue = useCallback(
    (next: TabsValue) => {
      setActiveState(next);
      onValueChange?.(next);
    },
    [onValueChange, setActiveState],
  );

  const registerTab = useCallback((tab: RegisteredTab) => {
    tabs.current = [...tabs.current, tab];

    return () => {
      tabs.current = tabs.current.filter((item) => item !== tab);
    };
  }, []);

  const getOrderedTabs = useCallback(() => tabs.current, []);

  useEffect(() => {
    const ordered = tabs.current;
    if (ordered.length === 0) {
      return;
    }

    if (activeValue == null) {
      const firstValue = ordered[0]?.value;
      if (!isControlled && firstValue) {
        setActiveState(firstValue);
        onValueChange?.(firstValue);
      }
    }
  }, [activeValue, isControlled, onValueChange, setActiveState]);

  useEffect(() => {
    if (manualActivation) {
      if (focusValue == null && activeValue != null) {
        setFocusValue(activeValue, { shouldFocus: false });
      }
      return;
    }

    if (activeValue != null && focusValue !== activeValue) {
      setFocusValue(activeValue);
    }
  }, [activeValue, focusValue, manualActivation, setFocusValue]);

  const setFocusValue = useCallback(
    (value: TabsValue | null, options?: { shouldFocus?: boolean }) => {
      setFocus(value);
      if (value == null || options?.shouldFocus === false) {
        return;
      }
      const ref = tabs.current.find((tab) => tab.value === value)?.ref.current;
      ref?.focus();
    },
    [],
  );

  const baseId = useId();

  return useMemo(
    () => ({
      activeValue,
      focusValue,
      manualActivation,
      orientation,
      baseId,
      registerTab,
      setActiveValue,
      setFocusValue,
      getOrderedTabs,
    }),
    [
      activeValue,
      focusValue,
      manualActivation,
      orientation,
      baseId,
      registerTab,
      setActiveValue,
      setFocusValue,
      getOrderedTabs,
    ],
  );
}

function TabsRoot(props: TabsRootProps) {
  const contextValue = useTabsInternal(props);

  return (
    <TabsContext.Provider value={contextValue}>
      {props.children}
    </TabsContext.Provider>
  );
}

function TabsList({ children, className = "", id }: TabsListProps) {
  const ctx = useTabsContext();

  return (
    <div
      role="tablist"
      id={id}
      aria-orientation={
        ctx.orientation === "vertical" ? "vertical" : undefined
      }
      className={className}
    >
      {children}
    </div>
  );
}

function isTabDisabled(tab: RegisteredTab) {
  const node = tab.ref.current;
  return node?.hasAttribute("disabled") ?? false;
}

function getEnabledValue(
  orderedTabs: RegisteredTab[],
  startIndex: number,
  direction: 1 | -1,
): TabsValue | null {
  if (orderedTabs.length === 0) {
    return null;
  }

  let attempts = orderedTabs.length;
  let current = startIndex;
  while (attempts > 0) {
    const tab = orderedTabs[(current + orderedTabs.length) % orderedTabs.length];
    if (!isTabDisabled(tab)) {
      return tab.value;
    }
    current += direction;
    attempts -= 1;
  }
  return null;
}

function getNextValue(
  value: TabsValue | null,
  orientation: Orientation,
  event: KeyboardEvent<HTMLButtonElement>,
  orderedTabs: RegisteredTab[],
) {
  if (orderedTabs.length === 0) {
    return null;
  }

  const currentIndex = orderedTabs.findIndex((tab) => tab.value === value);
  const lastIndex = orderedTabs.length - 1;

  switch (event.key) {
    case "ArrowRight":
      if (orientation !== "horizontal") return null;
      return getEnabledValue(
        orderedTabs,
        (currentIndex === -1 ? 0 : currentIndex) + 1,
        1,
      );
    case "ArrowLeft":
      if (orientation !== "horizontal") return null;
      return getEnabledValue(
        orderedTabs,
        (currentIndex === -1 ? orderedTabs.length : currentIndex) - 1,
        -1,
      );
    case "ArrowDown":
      if (orientation !== "vertical") return null;
      return getEnabledValue(
        orderedTabs,
        (currentIndex === -1 ? 0 : currentIndex) + 1,
        1,
      );
    case "ArrowUp":
      if (orientation !== "vertical") return null;
      return getEnabledValue(
        orderedTabs,
        (currentIndex === -1 ? orderedTabs.length : currentIndex) - 1,
        -1,
      );
    case "Home":
      return getEnabledValue(orderedTabs, 0, 1);
    case "End":
      return getEnabledValue(orderedTabs, lastIndex, -1);
    default:
      return null;
  }
}

function TabsTrigger({
  value,
  children,
  disabled = false,
  className = "",
}: TabsTriggerProps) {
  const ctx = useTabsContext();
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => ctx.registerTab({ value, ref }), [ctx, value]);

  const isActive = ctx.activeValue === value;
  const isFocused = ctx.focusValue === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;
  const tabIndex = disabled ? -1 : isFocused ? 0 : -1;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (
        event.key !== "ArrowRight" &&
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowUp" &&
        event.key !== "ArrowDown" &&
        event.key !== "Home" &&
        event.key !== "End" &&
        event.key !== "Enter" &&
        event.key !== " "
      ) {
        return;
      }

      const ordered = ctx.getOrderedTabs();

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        if (!disabled) {
          ctx.setActiveValue(value);
          ctx.setFocusValue(value);
        }
        return;
      }

      const nextValue = getNextValue(
        ctx.focusValue ?? ctx.activeValue ?? ordered[0]?.value ?? null,
        ctx.orientation,
        event,
        ordered,
      );

      if (!nextValue) {
        return;
      }

      event.preventDefault();
      ctx.setFocusValue(nextValue);
      if (!ctx.manualActivation && !disabled) {
        ctx.setActiveValue(nextValue);
      }
    },
    [ctx, disabled, value],
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    ctx.setActiveValue(value);
    ctx.setFocusValue(value, { shouldFocus: false });
  }, [ctx, disabled, value]);

  return (
    <button
      ref={ref}
      role="tab"
      id={tabId}
      type="button"
      aria-selected={isActive}
      aria-controls={panelId}
      aria-disabled={disabled || undefined}
      tabIndex={tabIndex}
      className={className}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onFocus={() => {
        if (!disabled) {
          ctx.setFocusValue(value, { shouldFocus: false });
        }
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function TabsPanel({ value, children, className = "", id }: TabsPanelProps) {
  const ctx = useTabsContext();
  const isActive = ctx.activeValue === value;
  const panelId = id ?? `${ctx.baseId}-panel-${value}`;
  const tabId = `${ctx.baseId}-tab-${value}`;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!isActive}
      className={className}
    >
      {isActive ? children : null}
    </div>
  );
}

export function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("useTabsContext must be used within <Tabs.Root>");
  }
  return ctx;
}

export const Tabs = Object.assign(TabsRoot, {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
  useTabsContext,
});

export default Tabs;

