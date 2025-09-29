import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from 'react';

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
  const initialActiveId = initialTabs[0]?.id || '';
  const [activeId, setActiveId] = useState<string>(initialActiveId);
  const initialFocusedIndex = initialTabs.findIndex((tab) => tab.id === initialActiveId);
  const [focusedIndex, setFocusedIndex] = useState<number>(() =>
    initialFocusedIndex === -1 ? 0 : initialFocusedIndex,
  );
  const prevActive = useRef<string>('');
  const dragSrc = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  const setActive = useCallback(
    (id: string) => {
      setActiveId(id);
    },
    [],
  );

  const focusElement = useCallback((index: number) => {
    const node = tabRefs.current[index];
    if (!node) return;
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        node.focus();
      });
    } else {
      node.focus();
    }
  }, []);

  const focusTabAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= tabs.length) return;
      setFocusedIndex(index);
      focusElement(index);
    },
    [focusElement, tabs.length],
  );

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
    if (tabs.length === 0) return;
    const nextIndex = tabs.findIndex((tab) => tab.id === activeId);
    if (nextIndex !== -1) {
      setFocusedIndex((prev) => (prev !== nextIndex ? nextIndex : prev));
      focusElement(nextIndex);
      return;
    }
    setFocusedIndex((prev) => {
      const bounded = Math.min(prev, tabs.length - 1);
      focusElement(bounded);
      return bounded;
    });
  }, [activeId, focusElement, tabs]);

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
  };

  const handleTabKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextIndex = (index - 1 + tabs.length) % tabs.length;
      focusTabAt(nextIndex);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      focusTabAt(nextIndex);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      focusTabAt(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      focusTabAt(tabs.length - 1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const nextTab = tabs[index];
      if (nextTab) {
        setActive(nextTab.id);
      }
    }
  };

  return (
    <div
      className={`flex flex-col w-full h-full ${className}`.trim()}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-shrink-0 bg-gray-800 text-white text-sm overflow-x-auto" role="tablist">
        {tabs.map((t, i) => (
          <div
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue ${
              t.id === activeId ? 'bg-gray-700' : 'bg-gray-800'
            }`}
            draggable
            onDragStart={handleDragStart(i)}
            onDragOver={handleDragOver(i)}
            onDrop={handleDrop(i)}
            onClick={() => {
              setFocusedIndex(i);
              setActive(t.id);
            }}
            onFocus={() => setFocusedIndex(i)}
            onKeyDown={handleTabKeyDown(i)}
            tabIndex={focusedIndex === i ? 0 : -1}
            role="tab"
            aria-selected={t.id === activeId}
          >
            <span className="max-w-[150px]">{middleEllipsis(t.title)}</span>
            {t.closable !== false && tabs.length > 1 && (
              <button
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
          </div>
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
        {tabs.map((t) => (
          <TabContext.Provider
            key={t.id}
            value={{ id: t.id, active: t.id === activeId, close: () => closeTab(t.id) }}
          >
            <div
              className={`absolute inset-0 w-full h-full ${
                t.id === activeId ? 'block' : 'hidden'
              }`}
            >
              {t.content}
            </div>
          </TabContext.Provider>
        ))}
      </div>
    </div>
  );
};

export default TabbedWindow;
