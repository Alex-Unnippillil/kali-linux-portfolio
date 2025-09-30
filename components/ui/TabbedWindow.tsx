import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';

function middleEllipsis(text: string, max = 30) {
  if (text.length <= max) return text;
  const half = Math.floor((max - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(text.length - half)}`;
}

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
}

interface TabContextValue {
  id: string;
  active: boolean;
  close: () => void;
}

const TabContext = createContext<TabContextValue>({ id: '', active: false, close: () => {} });
export const useTab = () => useContext(TabContext);

const TabbedWindow: React.FC<TabbedWindowProps> = ({
  initialTabs,
  onNewTab,
  onTabsChange,
  className = '',
}) => {
  const [tabs, setTabs] = useState<TabDefinition[]>(initialTabs);
  const [activeId, setActiveId] = useState<string>(initialTabs[0]?.id || '');
  const [isMobile, setIsMobile] = useState(false);
  const prevActive = useRef<string>('');
  const dragSrc = useRef<number | null>(null);
  const idRef = useRef(`tabbed-window-${Math.random().toString(36).slice(2)}`);
  const tabsRef = useRef(tabs);
  const skipHistoryUpdateRef = useRef(false);
  const hasInitializedHistoryRef = useRef(false);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const applyMatches = (matches: boolean) => setIsMobile(matches);
    const handleChange = (event: MediaQueryListEvent) => applyMatches(event.matches);

    applyMatches(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (prevActive.current !== activeId) {
      const prev = tabs.find((t) => t.id === prevActive.current);
      const next = tabs.find((t) => t.id === activeId);
      if (prev && prev.onDeactivate) prev.onDeactivate();
      if (next && next.onActivate) next.onActivate();
      prevActive.current = activeId;
    }
  }, [activeId, tabs]);

  const updateTabs = useCallback(
    (updater: (prev: TabDefinition[]) => TabDefinition[]) => {
      setTabs((prev) => {
        const next = updater(prev);
        onTabsChange?.(next);
        return next;
      });
    },
    [onTabsChange],
  );

  const setActive = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? prev : id));
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      updateTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        const removed = prev[idx];
        const next = prev.filter((t) => t.id !== id);
        if (removed && removed.onClose) removed.onClose();
        if (id === activeId && next.length > 0) {
          const fallback = next[idx] || next[idx - 1];
          setActiveId(fallback.id);
        } else if (next.length === 0 && onNewTab) {
          const tab = onNewTab();
          next.push(tab);
          setActiveId(tab.id);
        }
        return next;
      });
    },
    [activeId, onNewTab, updateTabs],
  );

  const addTab = useCallback(() => {
    if (!onNewTab) return;
    const tab = onNewTab();
    updateTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, [onNewTab, updateTabs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as
        | {
            tabbedWindows?: Record<string, string>;
          }
        | null
        | undefined;
      const targetId = state?.tabbedWindows?.[idRef.current];
      if (!targetId) return;
      const exists = tabsRef.current.some((t) => t.id === targetId);
      if (!exists) return;
      skipHistoryUpdateRef.current = true;
      setActiveId(targetId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeId) return;

    const state = window.history.state ?? {};
    const tabbedWindows = { ...(state.tabbedWindows ?? {}), [idRef.current]: activeId };
    const nextState = { ...state, tabbedWindows };

    if (!hasInitializedHistoryRef.current) {
      hasInitializedHistoryRef.current = true;
      window.history.replaceState(nextState, '');
      return;
    }

    if (skipHistoryUpdateRef.current) {
      skipHistoryUpdateRef.current = false;
      return;
    }

    window.history.pushState(nextState, '');
  }, [activeId]);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragSrc.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const src = dragSrc.current;
    if (src === null || src === index) return;
    updateTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      closeTab(activeId);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      addTab();
      return;
    }
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      setTabs((prev) => {
        if (prev.length === 0) return prev;
        const idx = prev.findIndex((t) => t.id === activeId);
        const nextIdx = e.shiftKey
          ? (idx - 1 + prev.length) % prev.length
          : (idx + 1) % prev.length;
        const nextTab = prev[nextIdx];
        setActiveId(nextTab.id);
        return prev;
      });
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setTabs((prev) => {
        if (prev.length === 0) return prev;
        const idx = prev.findIndex((t) => t.id === activeId);
        const nextIdx =
          e.key === 'ArrowLeft'
            ? (idx - 1 + prev.length) % prev.length
            : (idx + 1) % prev.length;
        const nextTab = prev[nextIdx];
        setActiveId(nextTab.id);
        return prev;
      });
    }
  };

  const tabListClassName = [
    'flex bg-gray-800 text-white text-sm overflow-x-auto',
    isMobile ? 'sticky top-0 z-10' : 'flex-shrink-0',
  ].join(' ');

  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <div
      className={`flex flex-col w-full h-full ${className}`.trim()}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className={tabListClassName} role="tablist" aria-orientation="horizontal">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none focus:outline-none focus-visible:ring ${
              t.id === activeId ? 'bg-gray-700' : 'bg-gray-800'
            }`}
            draggable
            onDragStart={handleDragStart(i)}
            onDragOver={handleDragOver(i)}
            onDrop={handleDrop(i)}
            onClick={() => setActive(t.id)}
            role="tab"
            aria-selected={t.id === activeId}
            aria-controls={`${idRef.current}-${t.id}-panel`}
            id={`${idRef.current}-${t.id}-tab`}
            title={t.title}
          >
            <span className="max-w-[150px]">{middleEllipsis(t.title)}</span>
            {t.closable !== false && tabs.length > 1 && (
              <button
                type="button"
                className="p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
                aria-label="Close Tab"
              >
                ×
              </button>
            )}
          </button>
        ))}
        {onNewTab && (
          <button
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700"
            onClick={addTab}
            aria-label="New Tab"
          >
            +
          </button>
        )}
      </div>
      <div className="flex-grow relative overflow-hidden">
        {isMobile ? (
          activeTab && (
            <TabContext.Provider
              value={{ id: activeTab.id, active: true, close: () => closeTab(activeTab.id) }}
            >
              <div
                className="absolute inset-0 w-full h-full overflow-auto"
                role="tabpanel"
                id={`${idRef.current}-${activeTab.id}-panel`}
                aria-labelledby={`${idRef.current}-${activeTab.id}-tab`}
              >
                {activeTab.content}
              </div>
            </TabContext.Provider>
          )
        ) : (
          tabs.map((t) => (
            <TabContext.Provider
              key={t.id}
              value={{ id: t.id, active: t.id === activeId, close: () => closeTab(t.id) }}
            >
              <div
                className={`absolute inset-0 w-full h-full ${
                  t.id === activeId ? 'block' : 'hidden'
                }`}
                role="tabpanel"
                id={`${idRef.current}-${t.id}-panel`}
                aria-labelledby={`${idRef.current}-${t.id}-tab`}
              >
                {t.content}
              </div>
            </TabContext.Provider>
          ))
        )}
      </div>
    </div>
  );
};

export default TabbedWindow;
