import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BaseWindow from "../base/window";
import WindowTabs, {
  WindowTabDefinition,
  WindowTabDragPayload,
  WindowTabReorderPosition,
} from "../window/WindowTabs";
import {
  clampWindowPositionWithinViewport,
  clampWindowTopPosition,
  measureWindowTopOffset,
} from "../../utils/windowLayout";

type BaseWindowProps = React.ComponentProps<typeof BaseWindow>;
// BaseWindow is a class component, so the instance type exposes helper methods.
type BaseWindowInstance = InstanceType<typeof BaseWindow> | null;

type MutableRef<T> = React.MutableRefObject<T>;

type DesktopWindowTab = WindowTabDefinition & { context?: unknown };

interface StoredTabState {
  order: string[];
  activeId: string | null;
}

const reorderTabs = (tabs: DesktopWindowTab[], order: string[]): DesktopWindowTab[] => {
  if (!Array.isArray(order) || order.length === 0) return tabs.slice();
  const map = new Map<string, DesktopWindowTab>();
  tabs.forEach((tab) => {
    map.set(tab.id, tab);
  });
  const result: DesktopWindowTab[] = [];
  order.forEach((id) => {
    const tab = map.get(id);
    if (tab) {
      result.push(tab);
      map.delete(id);
    }
  });
  map.forEach((tab) => {
    result.push(tab);
  });
  return result;
};

const readStoredTabState = (key: string): StoredTabState | null => {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter((value: unknown): value is string => typeof value === "string")
      : [];
    const activeId = typeof parsed.activeId === "string" ? parsed.activeId : null;
    return { order, activeId };
  } catch (error) {
    return null;
  }
};

const persistTabState = (key: string, order: string[], activeId: string | null) => {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(key, JSON.stringify({ order, activeId }));
  } catch (error) {
    // ignore persistence failures
  }
};

const parsePx = (value?: string | null): number | null => {
  if (typeof value !== "string") return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readNodePosition = (node: HTMLElement): { x: number; y: number } | null => {
  const style = node.style as CSSStyleDeclaration | undefined;
  if (!style) {
    return null;
  }

  if (typeof style.getPropertyValue === "function") {
    const x = parsePx(style.getPropertyValue("--window-transform-x"));
    const y = parsePx(style.getPropertyValue("--window-transform-y"));
    if (x !== null && y !== null) {
      return { x, y };
    }
  }

  const transform = style.transform;
  if (typeof transform === "string" && transform.length) {
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
    if (match) {
      const parsedX = parseFloat(match[1]);
      const parsedY = parseFloat(match[2]);
      if (Number.isFinite(parsedX) && Number.isFinite(parsedY)) {
        return { x: parsedX, y: parsedY };
      }
    }
  }

  return null;
};

interface DesktopWindowProps extends BaseWindowProps {
  tabs?: DesktopWindowTab[];
  initialTabs?: DesktopWindowTab[];
  activeTabId?: string | null;
  defaultActiveTabId?: string;
  onTabsChange?: (tabs: DesktopWindowTab[], activeTabId: string | null) => void;
  onTabSelect?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabTearOut?: (payload: WindowTabDragPayload, position: { clientX: number; clientY: number }) => void;
  onTabReorder?: (
    payload: WindowTabDragPayload,
    targetId: string | null,
    position: WindowTabReorderPosition,
  ) => void;
  tabPersistenceKey?: string;
}

const DesktopWindow = React.forwardRef<BaseWindowInstance, DesktopWindowProps>(
  (props, forwardedRef) => {
    const {
      tabs,
      initialTabs,
      activeTabId: controlledActiveId,
      defaultActiveTabId,
      onTabsChange,
      onTabSelect,
      onTabClose,
      onTabTearOut,
      onTabReorder,
      tabPersistenceKey,
      title,
      context,
      id,
      ...restProps
    } = props;

    const innerRef = useRef<BaseWindowInstance>(null);

    const assignRef = useCallback(
      (instance: BaseWindowInstance) => {
        innerRef.current = instance;
        if (!forwardedRef) return;
        if (typeof forwardedRef === "function") {
          forwardedRef(instance);
        } else {
          (forwardedRef as MutableRef<BaseWindowInstance>).current = instance;
        }
      },
      [forwardedRef],
    );

    const clampToViewport = useCallback(() => {
      if (typeof window === "undefined") return;
      const instance = innerRef.current;
      const node = instance && typeof instance.getWindowNode === "function"
        ? instance.getWindowNode()
        : null;
      if (!node || typeof node.getBoundingClientRect !== "function") return;

      const rect = node.getBoundingClientRect();
      const topOffset = measureWindowTopOffset();
      const storedPosition = readNodePosition(node);
      const fallbackPosition = {
        x: typeof props.initialX === "number" ? props.initialX : 0,
        y: clampWindowTopPosition(props.initialY, topOffset),
      };
      const currentPosition = storedPosition || fallbackPosition;
      const clamped = clampWindowPositionWithinViewport(currentPosition, rect, {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        topOffset,
      });
      if (!clamped) return;
      if (clamped.x === currentPosition.x && clamped.y === currentPosition.y) {
        return;
      }

      node.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
      if (typeof node.style.setProperty === "function") {
        node.style.setProperty("--window-transform-x", `${clamped.x}px`);
        node.style.setProperty("--window-transform-y", `${clamped.y}px`);
      } else {
        (node.style as unknown as Record<string, string>)["--window-transform-x"] = `${clamped.x}px`;
        (node.style as unknown as Record<string, string>)["--window-transform-y"] = `${clamped.y}px`;
      }

      if (typeof props.onPositionChange === "function") {
        props.onPositionChange(clamped.x, clamped.y);
      }
    }, [props.initialX, props.initialY, props.onPositionChange]);

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const handler = () => clampToViewport();
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("resize", handler);
      };
    }, [clampToViewport]);

    const baseTabs = useMemo(() => (Array.isArray(initialTabs) ? initialTabs : []), [initialTabs]);
    const isTabsControlled = Array.isArray(tabs);
    const isActiveControlled = controlledActiveId !== undefined;
    const hasTabstrip = (isTabsControlled ? (tabs?.length ?? 0) : baseTabs.length) > 0;
    const windowId = typeof id === "string" ? id : id != null ? String(id) : "window";
    const storageKey = hasTabstrip
      ? tabPersistenceKey ?? (typeof windowId === "string" ? `desktop-window-tabs:${windowId}` : null)
      : null;

    const persistedState = useMemo(
      () => (storageKey ? readStoredTabState(storageKey) : null),
      [storageKey],
    );

    const orderedBaseTabs = useMemo(
      () => reorderTabs(baseTabs, persistedState?.order ?? []),
      [baseTabs, persistedState?.order],
    );

    const [managedTabs, setManagedTabs] = useState<DesktopWindowTab[]>(() => {
      if (!hasTabstrip || isTabsControlled) return [];
      return orderedBaseTabs;
    });

    const [managedActiveId, setManagedActiveId] = useState<string | null>(() => {
      if (!hasTabstrip) return null;
      if (isActiveControlled) {
        return controlledActiveId ?? null;
      }
      const availableTabs = isTabsControlled ? tabs ?? [] : orderedBaseTabs;
      const persistedActive = persistedState?.activeId;
      if (persistedActive && availableTabs.some((tab) => tab.id === persistedActive)) {
        return persistedActive;
      }
      if (defaultActiveTabId && availableTabs.some((tab) => tab.id === defaultActiveTabId)) {
        return defaultActiveTabId;
      }
      return availableTabs[0]?.id ?? null;
    });

    const persistState = useCallback(
      (nextTabs: DesktopWindowTab[], nextActiveId: string | null) => {
        if (!storageKey || isTabsControlled) return;
        persistTabState(storageKey, nextTabs.map((tab) => tab.id), nextActiveId ?? null);
      },
      [isTabsControlled, storageKey],
    );

    const effectiveTabs = hasTabstrip
      ? (isTabsControlled ? tabs ?? [] : managedTabs)
      : [];
    const fallbackActiveId = effectiveTabs[0]?.id ?? null;
    const activeId = hasTabstrip
      ? isActiveControlled
        ? controlledActiveId ?? fallbackActiveId
        : managedActiveId ?? fallbackActiveId
      : null;

    useEffect(() => {
      if (!hasTabstrip || isActiveControlled) return;
      if (activeId && effectiveTabs.some((tab) => tab.id === activeId)) return;
      const fallback = effectiveTabs[0]?.id ?? null;
      setManagedActiveId(fallback);
      persistState(effectiveTabs, fallback);
    }, [activeId, effectiveTabs, hasTabstrip, isActiveControlled, persistState]);

    const handleSelect = useCallback(
      (tabId: string) => {
        if (!hasTabstrip) return;
        onTabSelect?.(tabId);
        if (!isActiveControlled) {
          setManagedActiveId(tabId);
        }
        persistState(effectiveTabs, tabId);
      },
      [effectiveTabs, hasTabstrip, isActiveControlled, onTabSelect, persistState],
    );

    const handleClose = useCallback(
      (tabId: string) => {
        if (!hasTabstrip) return;
        onTabClose?.(tabId);
        if (isTabsControlled) {
          const currentTabs = tabs ?? [];
          const nextTabs = currentTabs.filter((tab) => tab.id !== tabId);
          const nextActive = isActiveControlled
            ? controlledActiveId === tabId
              ? nextTabs[0]?.id ?? null
              : controlledActiveId ?? null
            : activeId === tabId
              ? nextTabs[0]?.id ?? null
              : activeId;
          onTabsChange?.(nextTabs, nextActive ?? null);
          persistState(nextTabs, nextActive ?? null);
          return;
        }

        setManagedTabs((prev) => {
          if (!prev.some((tab) => tab.id === tabId)) return prev;
          const filtered = prev.filter((tab) => tab.id !== tabId);
          let nextActiveId = activeId;
          if (!isActiveControlled && tabId === activeId) {
            const closedIndex = prev.findIndex((tab) => tab.id === tabId);
            const fallback = filtered[closedIndex] || filtered[closedIndex - 1] || null;
            nextActiveId = fallback ? fallback.id : null;
            setManagedActiveId(nextActiveId);
          }
          persistState(filtered, nextActiveId ?? null);
          onTabsChange?.(filtered, nextActiveId ?? null);
          return filtered;
        });
      },
      [activeId, controlledActiveId, hasTabstrip, isActiveControlled, isTabsControlled, onTabClose, onTabsChange, persistState, tabs],
    );

    const handleReorder = useCallback(
      (payload: WindowTabDragPayload, targetId: string | null, position: WindowTabReorderPosition) => {
        onTabReorder?.(payload, targetId, position);
        if (!hasTabstrip) return;
        if (payload.windowId !== windowId) return;

        const applyReorder = (list: DesktopWindowTab[]): DesktopWindowTab[] => {
          const sourceIndex = list.findIndex((tab) => tab.id === payload.tabId);
          if (sourceIndex === -1) return list;
          const working = list.slice();
          const [moved] = working.splice(sourceIndex, 1);

          let targetIndex: number;
          if (position === "end" || targetId === null) {
            targetIndex = working.length;
          } else {
            targetIndex = working.findIndex((tab) => tab.id === targetId);
            if (targetIndex === -1) {
              working.splice(sourceIndex, 0, moved);
              return list;
            }
            if (position === "after") {
              targetIndex += 1;
            }
          }

          const finalIndex = Math.max(0, Math.min(targetIndex, working.length));
          working.splice(finalIndex, 0, moved);

          const noChange = working.length === list.length && working.every((tab, index) => tab.id === list[index].id);
          return noChange ? list : working;
        };

        if (isTabsControlled) {
          const currentTabs = tabs ?? [];
          const nextTabs = applyReorder(currentTabs);
          if (nextTabs !== currentTabs) {
            onTabsChange?.(nextTabs, activeId ?? null);
            persistState(nextTabs, activeId ?? null);
          }
          return;
        }

        setManagedTabs((prev) => {
          const next = applyReorder(prev);
          if (next === prev) return prev;
          persistState(next, activeId ?? null);
          onTabsChange?.(next, activeId ?? null);
          return next;
        });
      },
      [activeId, hasTabstrip, isTabsControlled, onTabReorder, onTabsChange, persistState, tabs, windowId],
    );

    const tabstrip = hasTabstrip && effectiveTabs.length > 0
      ? (
          <WindowTabs
            windowId={windowId}
            tabs={effectiveTabs}
            activeTabId={activeId ?? null}
            onTabSelect={handleSelect}
            onTabClose={handleClose}
            onTabReorder={handleReorder}
            onTabTearOut={onTabTearOut}
          />
        )
      : null;

    const activeTab = hasTabstrip ? effectiveTabs.find((tab) => tab.id === activeId) : null;
    const resolvedTitle = activeTab?.title ?? title;
    const resolvedContext = activeTab?.context ?? context;

    return (
      <BaseWindow
        ref={assignRef}
        {...restProps}
        id={id}
        title={resolvedTitle}
        context={resolvedContext}
        titleBarContent={tabstrip}
      />
    );
  },
);

DesktopWindow.displayName = "DesktopWindow";

export default DesktopWindow;
