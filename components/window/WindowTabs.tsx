import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";

export interface WindowTabDragPayload {
  windowId: string;
  tabId: string;
}

export interface WindowTabDefinition {
  id: string;
  title: string;
  icon?: React.ReactNode;
  closable?: boolean;
  dirty?: boolean;
}

export type WindowTabReorderPosition = "before" | "after" | "end";

export interface WindowTabsProps {
  windowId: string;
  tabs: WindowTabDefinition[];
  activeTabId: string | null;
  onTabSelect?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabReorder?: (
    source: WindowTabDragPayload,
    targetId: string | null,
    position: WindowTabReorderPosition,
  ) => void;
  onTabTearOut?: (payload: WindowTabDragPayload, position: { clientX: number; clientY: number }) => void;
  renderTabAccessory?: (tab: WindowTabDefinition) => React.ReactNode;
}

const DRAG_TYPE = "application/x-window-tab";
const isDragPayload = (value: unknown): value is WindowTabDragPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<WindowTabDragPayload>;
  return typeof payload.windowId === "string" && typeof payload.tabId === "string";
};

function serializePayload(payload: WindowTabDragPayload) {
  try {
    return JSON.stringify(payload);
  } catch (error) {
    return "";
  }
}

function parsePayload(raw: string | null): WindowTabDragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (isDragPayload(parsed)) return parsed;
  } catch (error) {
    // ignore malformed payloads
  }
  return null;
}

const getTabIndex = (tabs: WindowTabDefinition[], id: string | null) =>
  id ? tabs.findIndex((tab) => tab.id === id) : -1;

const WindowTabs: React.FC<WindowTabsProps> = ({
  windowId,
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabReorder,
  onTabTearOut,
  renderTabAccessory,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const activeId = tabs.length > 0 ? activeTabId ?? tabs[0].id : null;
  const [focusedTabId, setFocusedTabId] = useState<string | null>(activeId);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const focusTab = useCallback((id: string | null, opts: { preventScroll?: boolean } = {}) => {
    if (!id) return;
    const el = tabRefs.current.get(id);
    if (el) {
      el.focus({ preventScroll: opts.preventScroll ?? true });
    }
  }, []);

  useEffect(() => {
    if (activeId) {
      setFocusedTabId((prev) => (prev === activeId ? prev : activeId));
      focusTab(activeId);
    }
  }, [activeId, focusTab]);

  useEffect(() => {
    setFocusedTabId((prev) => {
      if (!prev) return tabs[0]?.id ?? null;
      return tabs.some((tab) => tab.id === prev) ? prev : tabs[0]?.id ?? null;
    });
  }, [tabs]);

  const handleSelect = useCallback(
    (id: string) => {
      onTabSelect?.(id);
      setFocusedTabId(id);
    },
    [onTabSelect],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (tabs.length === 0) return;
      const currentIndex = getTabIndex(tabs, focusedTabId ?? activeId);
      if (currentIndex === -1) return;

      const focusByIndex = (index: number) => {
        const tab = tabs[index];
        if (!tab) return;
        setFocusedTabId(tab.id);
        focusTab(tab.id, { preventScroll: false });
      };

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % tabs.length;
          focusByIndex(nextIndex);
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          event.preventDefault();
          const nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          focusByIndex(nextIndex);
          break;
        }
        case "Home": {
          event.preventDefault();
          focusByIndex(0);
          break;
        }
        case "End": {
          event.preventDefault();
          focusByIndex(tabs.length - 1);
          break;
        }
        case "Enter":
        case " ": {
          event.preventDefault();
          if (focusedTabId) {
            handleSelect(focusedTabId);
          }
          break;
        }
        case "Delete":
        case "Backspace": {
          if (!focusedTabId) return;
          const tab = tabs.find((candidate) => candidate.id === focusedTabId);
          if (!tab || tab.closable === false) return;
          event.preventDefault();
          onTabClose?.(focusedTabId);
          break;
        }
        default:
          break;
      }
    },
    [tabs, focusedTabId, activeId, focusTab, handleSelect, onTabClose],
  );

  const getPayloadFromEvent = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer) return null;
    const custom = parsePayload(event.dataTransfer.getData(DRAG_TYPE));
    if (custom) return custom;
    const fallback = parsePayload(event.dataTransfer.getData("text/plain"));
    return fallback;
  }, []);

  const emitReorder = useCallback(
    (
      source: WindowTabDragPayload,
      targetId: string | null,
      position: WindowTabReorderPosition,
    ) => {
      if (!onTabReorder) return;
      onTabReorder(source, targetId, position);
    },
    [onTabReorder],
  );

  const registerTabRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      tabRefs.current.set(id, node);
    } else {
      tabRefs.current.delete(id);
    }
  }, []);

  const handleDragStart = useCallback(
    (tabId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer) return;
      const payload: WindowTabDragPayload = { windowId, tabId };
      event.dataTransfer.effectAllowed = "move";
      const serialized = serializePayload(payload);
      if (serialized) {
        event.dataTransfer.setData(DRAG_TYPE, serialized);
        event.dataTransfer.setData("text/plain", serialized);
      }
      event.dataTransfer.setDragImage(event.currentTarget, 16, 16);
    },
    [windowId],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (!event.dataTransfer) return;
      const payload = getPayloadFromEvent(event);
      if (!payload) return;
      event.preventDefault();
      const sameWindow = payload.windowId === windowId;
      event.dataTransfer.dropEffect = sameWindow ? "move" : "link";
    },
    [getPayloadFromEvent, windowId],
  );

  const handleDropOnGap = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer) return;
      const payload = getPayloadFromEvent(event);
      if (!payload) return;
      event.preventDefault();
      emitReorder(payload, null, "end");
    },
    [emitReorder, getPayloadFromEvent],
  );

  const handleDropOnTab = useCallback(
    (targetId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
      if (!event.dataTransfer) return;
      const payload = getPayloadFromEvent(event);
      if (!payload) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const before = event.clientX < rect.left + rect.width / 2;
      emitReorder(payload, targetId, before ? "before" : "after");
    },
    [emitReorder, getPayloadFromEvent],
  );

  const handleDragEnd = useCallback(
    (tabId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!onTabTearOut) return;
      const dropEffect = event.dataTransfer?.dropEffect;
      const wasDropHandled = dropEffect && dropEffect !== "none";
      if (wasDropHandled) return;
      const fallbackX =
        typeof event.clientX === "number"
          ? event.clientX
          : typeof event.pageX === "number"
            ? event.pageX
            : typeof event.screenX === "number"
              ? event.screenX
              : 0;
      const fallbackY =
        typeof event.clientY === "number"
          ? event.clientY
          : typeof event.pageY === "number"
            ? event.pageY
            : typeof event.screenY === "number"
              ? event.screenY
              : 0;
      const position = { clientX: fallbackX, clientY: fallbackY };
      onTabTearOut({ windowId, tabId }, position);
    },
    [onTabTearOut, windowId],
  );

  const listClasses = useMemo(
    () =>
      clsx(
        "flex w-full gap-1 overflow-x-auto whitespace-nowrap text-sm", 
        "scrollbar-thin",
      ),
    [],
  );

  return (
    <div className="flex w-full items-center" onKeyDown={handleKeyDown}>
      <div
        ref={listRef}
        role="tablist"
        aria-orientation="horizontal"
        className={listClasses}
        onDragOver={handleDragOver}
        onDrop={handleDropOnGap}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const isFocused = tab.id === focusedTabId;
          const tabIndex = isActive ? 0 : -1;
          return (
            <div
              key={tab.id}
              ref={(node) => registerTabRef(tab.id, node)}
              role="tab"
              aria-selected={isActive}
              tabIndex={tabIndex}
              className={clsx(
                "group flex min-w-[4rem] max-w-[16rem] items-center gap-2 rounded px-3 py-1.5 text-left transition",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange",
                isActive
                  ? "bg-ub-orange text-black shadow-inner shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                  : "bg-[color:var(--kali-panel)] text-[color:color-mix(in_srgb,var(--color-text)_92%,transparent)] hover:bg-[color:var(--kali-panel-highlight)] hover:text-[color:var(--color-text)]",
              )}
              onClick={() => handleSelect(tab.id)}
              onFocus={() => setFocusedTabId(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelect(tab.id);
                }
              }}
              draggable
              onDragStart={handleDragStart(tab.id)}
              onDragOver={handleDragOver}
              onDrop={handleDropOnTab(tab.id)}
              onDragEnd={handleDragEnd(tab.id)}
            >
              {tab.icon ? <span className="flex-shrink-0">{tab.icon}</span> : null}
              <span className="flex-1 truncate">
                {tab.title}
                {tab.dirty ? " •" : ""}
              </span>
              {renderTabAccessory ? renderTabAccessory(tab) : null}
              {tab.closable !== false && tabs.length > 1 ? (
                <span className="flex-shrink-0">
                  <button
                    type="button"
                    className="rounded p-1 text-xs transition hover:bg-[color:var(--kali-panel-highlight)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTabClose?.(tab.id);
                    }}
                    aria-label={`Close ${tab.title}`}
                  >
                    ×
                  </button>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WindowTabs;
