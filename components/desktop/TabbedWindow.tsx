import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

function middleEllipsis(text: string, max = 30) {
  if (text.length <= max) return text;
  const half = Math.floor((max - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(text.length - half)}`;
}

type RemoveOptions = {
  createReplacement?: boolean;
  callOnClose?: boolean;
};

const TAB_DRAG_TYPE = 'application/x-tabbed-window';

const sanitizeForDomId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const setDragPayload = (event: React.DragEvent, payload: DragPayload) => {
  try {
    event.dataTransfer.setData(TAB_DRAG_TYPE, JSON.stringify(payload));
  } catch (error) {
    // ignore serialization errors
  }
  try {
    event.dataTransfer.setData('text/plain', payload.tabId);
  } catch (error) {
    // ignore serialization errors
  }
};

const parseDragPayload = (dataTransfer: DataTransfer): DragPayload | null => {
  const raw = dataTransfer.getData(TAB_DRAG_TYPE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.tabId === 'string') {
      return parsed as DragPayload;
    }
  } catch (error) {
    // ignore invalid payloads
  }
  return null;
};

export interface TabDefinition {
  id: string;
  title: string;
  content: React.ReactNode;
  closable?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onClose?: () => void;
}

interface TabbedWindowProps {
  initialTabs: TabDefinition[];
  onNewTab?: () => TabDefinition;
  onTabsChange?: (tabs: TabDefinition[]) => void;
  className?: string;
  groupId?: string;
  tabListLabel?: string;
}

interface TabContextValue {
  id: string;
  active: boolean;
  close: () => void;
}

interface DragPayload {
  sourceId: string;
  tabId: string;
  groupId?: string;
}

interface DragExtractResult {
  tab: TabDefinition | null;
  index: number;
  wasActive: boolean;
}

interface TabbedWindowHandle {
  groupId?: string;
  extractTab: (tabId: string) => DragExtractResult | null;
}

const TabContext = createContext<TabContextValue>({ id: '', active: false, close: () => {} });
export const useTab = () => useContext(TabContext);

const tabbedWindowRegistry = new Map<string, TabbedWindowHandle>();

const TabbedWindow: React.FC<TabbedWindowProps> = ({
  initialTabs,
  onNewTab,
  onTabsChange,
  className = '',
  groupId,
  tabListLabel = 'Window tabs',
}) => {
  const [tabs, setTabs] = useState<TabDefinition[]>(initialTabs);
  const [activeId, setActiveId] = useState<string>(initialTabs[0]?.id || '');
  const prevActive = useRef<string>('');
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const reactId = useId();
  const instanceId = useMemo(() => `tabbed-${sanitizeForDomId(reactId || 'instance')}`, [reactId]);

  useEffect(() => {
    if (prevActive.current !== activeId) {
      const prev = tabs.find((tab) => tab.id === prevActive.current);
      const next = tabs.find((tab) => tab.id === activeId);
      if (prev && prev.onDeactivate) prev.onDeactivate();
      if (next && next.onActivate) next.onActivate();
      prevActive.current = activeId;
    }
  }, [activeId, tabs]);

  useEffect(() => {
    if (!activeId) return;
    const node = tabRefs.current[activeId];
    if (node) {
      node.focus();
    }
  }, [activeId, tabs.length]);

  const updateTabs = useCallback(
    (updater: (previous: TabDefinition[]) => TabDefinition[]) => {
      setTabs((previous) => {
        const next = updater(previous);
        onTabsChange?.(next);
        return next;
      });
    },
    [onTabsChange],
  );

  const removeTab = useCallback(
    (id: string, options: RemoveOptions = {}): DragExtractResult | null => {
      const { createReplacement = true, callOnClose = true } = options;
      let removed: TabDefinition | null = null;
      let removedIndex = -1;
      let shouldDeactivate = false;

      updateTabs((previous) => {
        const index = previous.findIndex((tab) => tab.id === id);
        if (index === -1) return previous;

        removedIndex = index;
        removed = previous[index];
        shouldDeactivate = id === activeId;

        const next = previous.filter((tab) => tab.id !== id);
        delete tabRefs.current[id];

        if (shouldDeactivate) {
          if (next.length > 0) {
            const fallback = next[index] || next[index - 1];
            if (fallback) {
              setActiveId(fallback.id);
            }
          } else if (createReplacement && onNewTab) {
            const tab = onNewTab();
            next.push(tab);
            setActiveId(tab.id);
          } else {
            setActiveId('');
          }
        }

        return next;
      });

      if (!removed) return null;

      if (shouldDeactivate) {
        removed.onDeactivate?.();
      }
      if (callOnClose) {
        removed.onClose?.();
      }

      return { tab: removed, index: removedIndex, wasActive: shouldDeactivate };
    },
    [activeId, onNewTab, updateTabs],
  );

  const closeTab = useCallback(
    (id: string) => {
      removeTab(id, { createReplacement: true, callOnClose: true });
    },
    [removeTab],
  );

  const setActive = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const addTab = useCallback(() => {
    if (!onNewTab) return;
    const tab = onNewTab();
    updateTabs((previous) => [...previous, tab]);
    setActiveId(tab.id);
  }, [onNewTab, updateTabs]);

  const moveTabById = useCallback(
    (id: string, targetIndex: number) => {
      updateTabs((previous) => {
        const currentIndex = previous.findIndex((tab) => tab.id === id);
        if (currentIndex === -1) return previous;
        if (currentIndex === targetIndex) return previous;
        const next = [...previous];
        const [moved] = next.splice(currentIndex, 1);
        const boundedIndex = Math.max(0, Math.min(targetIndex, next.length));
        next.splice(boundedIndex, 0, moved);
        return next;
      });
    },
    [updateTabs],
  );

  const insertTab = useCallback(
    (tab: TabDefinition, index?: number) => {
      updateTabs((previous) => {
        const next = [...previous];
        const boundedIndex = index === undefined ? next.length : Math.max(0, Math.min(index, next.length));
        next.splice(boundedIndex, 0, tab);
        return next;
      });
      setActiveId(tab.id);
    },
    [updateTabs],
  );

  const extractTab = useCallback(
    (id: string) => removeTab(id, { createReplacement: false, callOnClose: false }),
    [removeTab],
  );

  useEffect(() => {
    const handle: TabbedWindowHandle = {
      groupId,
      extractTab,
    };
    tabbedWindowRegistry.set(instanceId, handle);
    return () => {
      tabbedWindowRegistry.delete(instanceId);
    };
  }, [extractTab, groupId, instanceId]);

  const canAcceptDrop = useCallback(
    (payload: DragPayload | null) => {
      if (!payload) return false;
      if (payload.sourceId === instanceId) return true;
      if (!groupId || !payload.groupId) return false;
      return payload.groupId === groupId;
    },
    [groupId, instanceId],
  );

  const handleTabDragStart = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    const tab = tabs[index];
    if (!tab) return;
    setDragPayload(event, { sourceId: instanceId, tabId: tab.id, groupId });
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const payload = parseDragPayload(event.dataTransfer);
    if (!canAcceptDrop(payload)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnTab = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    const payload = parseDragPayload(event.dataTransfer);
    if (!canAcceptDrop(payload)) return;

    event.preventDefault();
    event.stopPropagation();

    if (!payload) return;

    if (payload.sourceId === instanceId) {
      const currentIndex = tabs.findIndex((tab) => tab.id === payload.tabId);
      if (currentIndex === -1) return;
      const targetIndex = currentIndex < index ? index - 1 : index;
      moveTabById(payload.tabId, targetIndex);
      return;
    }

    const sourceHandle = tabbedWindowRegistry.get(payload.sourceId);
    if (!sourceHandle || sourceHandle.groupId !== groupId) return;
    const result = sourceHandle.extractTab(payload.tabId);
    if (!result || !result.tab) return;
    insertTab(result.tab, index);
  };

  const handleListDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const payload = parseDragPayload(event.dataTransfer);
    if (!canAcceptDrop(payload)) return;

    event.preventDefault();
    event.stopPropagation();

    if (!payload) return;

    if (payload.sourceId === instanceId) {
      const currentIndex = tabs.findIndex((tab) => tab.id === payload.tabId);
      if (currentIndex === -1) return;
      moveTabById(payload.tabId, tabs.length - 1);
      return;
    }

    const sourceHandle = tabbedWindowRegistry.get(payload.sourceId);
    if (!sourceHandle || sourceHandle.groupId !== groupId) return;
    const result = sourceHandle.extractTab(payload.tabId);
    if (!result || !result.tab) return;
    insertTab(result.tab);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (tabs.length === 0) return;

    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    const activeIndex = tabs.findIndex((tab) => tab.id === activeId);

    if (ctrlOrMeta && event.key.toLowerCase() === 'w') {
      event.preventDefault();
      closeTab(activeId);
      return;
    }

    if (ctrlOrMeta && event.key.toLowerCase() === 't') {
      event.preventDefault();
      addTab();
      return;
    }

    if (ctrlOrMeta && event.key === 'Tab') {
      event.preventDefault();
      if (tabs.length === 0) return;
      const nextIndex = event.shiftKey
        ? (activeIndex - 1 + tabs.length) % tabs.length
        : (activeIndex + 1) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (nextTab) setActiveId(nextTab.id);
      return;
    }

    if (ctrlOrMeta && event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'PageUp')) {
      event.preventDefault();
      if (activeIndex > 0) moveTabById(activeId, activeIndex - 1);
      return;
    }

    if (ctrlOrMeta && event.shiftKey && (event.key === 'ArrowRight' || event.key === 'PageDown')) {
      event.preventDefault();
      if (activeIndex !== -1 && activeIndex < tabs.length - 1) {
        moveTabById(activeId, activeIndex + 1);
      }
      return;
    }

    if (!ctrlOrMeta) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const nextIndex = activeIndex <= 0 ? tabs.length - 1 : activeIndex - 1;
        const nextTab = tabs[nextIndex];
        if (nextTab) setActiveId(nextTab.id);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = activeIndex >= tabs.length - 1 ? 0 : activeIndex + 1;
        const nextTab = tabs[nextIndex];
        if (nextTab) setActiveId(nextTab.id);
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        const nextTab = tabs[0];
        if (nextTab) setActiveId(nextTab.id);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        const nextTab = tabs[tabs.length - 1];
        if (nextTab) setActiveId(nextTab.id);
        return;
      }
    }
  };

  const handleTabKeyDown = (id: string) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActive(id);
    }
  };

  const setTabRef = (id: string) => (node: HTMLDivElement | null) => {
    tabRefs.current[id] = node;
  };

  return (
    <div
      className={`flex flex-col w-full h-full ${className}`.trim()}
      onKeyDown={handleKeyDown}
    >
      <div
        className="flex flex-shrink-0 bg-gray-800 text-white text-sm overflow-x-auto"
        role="tablist"
        aria-label={tabListLabel}
        onDragOver={handleDragOver}
        onDrop={handleListDrop}
      >
        {tabs.map((tab, index) => {
          const domSafeId = sanitizeForDomId(tab.id);
          const tabId = `${instanceId}-tab-${domSafeId}`;
          const panelId = `${instanceId}-panel-${domSafeId}`;
          const isActive = tab.id === activeId;

          return (
            <div
              key={tab.id}
              ref={setTabRef(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none outline-none ${
                isActive ? 'bg-gray-700' : 'bg-gray-800'
              }`}
              role="tab"
              id={tabId}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              draggable
              onDragStart={handleTabDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={handleDropOnTab(index)}
              onClick={() => setActive(tab.id)}
              onKeyDown={handleTabKeyDown(tab.id)}
            >
              <span className="max-w-[150px] whitespace-nowrap">{middleEllipsis(tab.title)}</span>
              {tab.closable !== false && tabs.length > 1 && (
                <button
                  type="button"
                  className="p-0.5"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                  aria-label="Close Tab"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {onNewTab && (
          <button
            type="button"
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700"
            onClick={addTab}
            aria-label="New Tab"
          >
            +
          </button>
        )}
      </div>
      <div className="flex-grow relative overflow-hidden">
        {tabs.map((tab) => {
          const domSafeId = sanitizeForDomId(tab.id);
          const panelId = `${instanceId}-panel-${domSafeId}`;
          const tabId = `${instanceId}-tab-${domSafeId}`;
          const isActive = tab.id === activeId;
          return (
            <TabContext.Provider
              key={tab.id}
              value={{ id: tab.id, active: isActive, close: () => closeTab(tab.id) }}
            >
              <div
                id={panelId}
                role="tabpanel"
                aria-labelledby={tabId}
                hidden={!isActive}
                aria-hidden={!isActive}
                className={`absolute inset-0 w-full h-full ${isActive ? 'block' : 'hidden'}`}
              >
                {tab.content}
              </div>
            </TabContext.Provider>
          );
        })}
      </div>
    </div>
  );
};

export default TabbedWindow;

