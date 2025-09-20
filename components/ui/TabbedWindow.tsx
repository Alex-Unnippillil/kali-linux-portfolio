import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import TabbedTitlebar from '../core/TabbedTitlebar';
import type { AppTabDefinition, DraggedTabPayload } from '../../types/apps';

interface TabContextValue {
  id: string;
  active: boolean;
  close: () => void;
}

const TabContext = createContext<TabContextValue>({ id: '', active: false, close: () => {} });
export const useTab = () => useContext(TabContext);

interface TabbedWindowProps {
  id?: string;
  initialTabs: AppTabDefinition[];
  onNewTab?: () => AppTabDefinition;
  onTabsChange?: (tabs: AppTabDefinition[]) => void;
  onTabDetached?: (tab: AppTabDefinition) => void;
  className?: string;
}

function createWindowId() {
  return `tab-window-${Math.random().toString(36).slice(2)}`;
}

const TabbedWindow: React.FC<TabbedWindowProps> = ({
  id,
  initialTabs,
  onNewTab,
  onTabsChange,
  onTabDetached,
  className = '',
}) => {
  const windowIdRef = useRef(id ?? createWindowId());
  const [tabs, setTabs] = useState<AppTabDefinition[]>(initialTabs);
  const [activeId, setActiveId] = useState<string>(initialTabs[0]?.id ?? '');
  const tabsRef = useRef<AppTabDefinition[]>(initialTabs);
  const prevActiveRef = useRef<string>('');

  useEffect(() => {
    const prevId = prevActiveRef.current;
    const prevTab = tabsRef.current.find((tab) => tab.id === prevId);
    const nextTab = tabs.find((tab) => tab.id === activeId);
    if (prevTab && prevTab !== nextTab) {
      prevTab.onDeactivate?.();
    }
    if (nextTab && prevId !== nextTab.id) {
      nextTab.onActivate?.();
    }
    prevActiveRef.current = nextTab?.id ?? '';
    tabsRef.current = tabs;
  }, [activeId, tabs]);

  const setActive = useCallback(
    (idToActivate: string) => {
      if (!idToActivate || idToActivate === activeId) return;
      const exists = tabsRef.current.some((tab) => tab.id === idToActivate);
      if (!exists) return;
      setActiveId(idToActivate);
    },
    [activeId],
  );

  const applyTabs = useCallback(
    (updater: (prev: AppTabDefinition[]) => AppTabDefinition[]) => {
      setTabs((prev) => {
        const next = updater(prev);
        onTabsChange?.(next);
        return next;
      });
    },
    [onTabsChange],
  );

  const addTab = useCallback(() => {
    if (!onNewTab) return;
    const tab = onNewTab();
    applyTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, [applyTabs, onNewTab]);

  const extractTab = useCallback(
    (tabId: string, options: { allowEmpty?: boolean } = {}) => {
      let removed: AppTabDefinition | null = null;
      applyTabs((prev) => {
        const idx = prev.findIndex((tab) => tab.id === tabId);
        if (idx === -1) return prev;
        const next = [...prev];
        [removed] = next.splice(idx, 1);
        if (next.length === 0) {
          if (onNewTab && !options.allowEmpty) {
            const fresh = onNewTab();
            next.push(fresh);
            setActiveId(fresh.id);
          } else {
            setActiveId('');
          }
        } else if (tabId === activeId) {
          const fallback = next[idx] || next[idx - 1] || next[0];
          setActiveId(fallback?.id ?? '');
        }
        return next;
      });
      return removed;
    },
    [activeId, applyTabs, onNewTab],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const removed = extractTab(tabId, { allowEmpty: false });
      removed?.onClose?.();
    },
    [extractTab],
  );

  const reorderTab = useCallback(
    (tabId: string, beforeTabId?: string) => {
      applyTabs((prev) => {
        const currentIndex = prev.findIndex((tab) => tab.id === tabId);
        if (currentIndex === -1) return prev;
        const next = [...prev];
        const [tab] = next.splice(currentIndex, 1);
        let insertIndex = beforeTabId ? next.findIndex((t) => t.id === beforeTabId) : next.length;
        if (insertIndex < 0) insertIndex = next.length;
        next.splice(insertIndex, 0, tab);
        return next;
      });
    },
    [applyTabs],
  );

  const insertTab = useCallback(
    (tab: AppTabDefinition, beforeTabId?: string) => {
      applyTabs((prev) => {
        const next = [...prev];
        let insertIndex = beforeTabId ? next.findIndex((t) => t.id === beforeTabId) : next.length;
        if (insertIndex < 0) insertIndex = next.length;
        next.splice(insertIndex, 0, tab);
        return next;
      });
      setActiveId(tab.id);
    },
    [applyTabs],
  );

  const getDragPayload = useCallback(
    (tabId: string): DraggedTabPayload | null => {
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab) return null;
      return {
        tab,
        sourceWindowId: windowIdRef.current,
        onRemove: () => extractTab(tabId, { allowEmpty: true }),
        onDetach: onTabDetached
          ? () => {
              const removed = extractTab(tabId, { allowEmpty: true });
              if (removed) {
                onTabDetached(removed);
              }
              return removed;
            }
          : undefined,
      };
    },
    [extractTab, onTabDetached],
  );

  const handleExternalDrop = useCallback(
    (payload: DraggedTabPayload, beforeTabId?: string) => {
      const incoming = payload.onRemove(windowIdRef.current, beforeTabId) ?? payload.tab;
      insertTab(incoming, beforeTabId);
    },
    [insertTab],
  );

  const handleDetach = useCallback(
    (payload: DraggedTabPayload) => {
      payload.onDetach?.();
    },
    [],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        closeTab(activeId);
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        addTab();
        return;
      }
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault();
        if (tabsRef.current.length === 0) return;
        const idx = tabsRef.current.findIndex((tab) => tab.id === activeId);
        const nextIdx = event.shiftKey
          ? (idx - 1 + tabsRef.current.length) % tabsRef.current.length
          : (idx + 1) % tabsRef.current.length;
        const nextTab = tabsRef.current[nextIdx];
        if (nextTab) setActiveId(nextTab.id);
        return;
      }
    },
    [activeId, addTab, closeTab],
  );

  return (
    <div
      className={`flex h-full w-full flex-col ${className}`.trim()}
      tabIndex={0}
      onKeyDown={onKeyDown}
      data-testid="tabbed-window"
      data-window-id={windowIdRef.current}
    >
      <TabbedTitlebar
        windowId={windowIdRef.current}
        tabs={tabs}
        activeTabId={activeId}
        onSelect={setActive}
        onClose={closeTab}
        onReorder={reorderTab}
        onDropExternal={handleExternalDrop}
        requestDetach={handleDetach}
        requestNewTab={onNewTab ? addTab : undefined}
        getDragPayload={getDragPayload}
      />
      <div className="relative flex-grow overflow-hidden">
        {tabs.map((tab) => (
          <TabContext.Provider
            key={tab.id}
            value={{ id: tab.id, active: tab.id === activeId, close: () => closeTab(tab.id) }}
          >
            <div
              className={`absolute inset-0 h-full w-full ${tab.id === activeId ? 'block' : 'hidden'}`}
            >
              {tab.content}
            </div>
          </TabContext.Provider>
        ))}
      </div>
    </div>
  );
};

export default TabbedWindow;
