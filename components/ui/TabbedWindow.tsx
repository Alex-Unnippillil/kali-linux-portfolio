import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  createContext,
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
  data?: Record<string, unknown>;
}

interface TabbedWindowProps {
  initialTabs: TabDefinition[];
  tabs?: TabDefinition[];
  onNewTab?: () => TabDefinition;
  onTabsChange?: (tabs: TabDefinition[]) => void;
  onDetachTab?: (tab: TabDefinition, index: number) => void;
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
  tabs: controlledTabs,
  onNewTab,
  onTabsChange,
  onDetachTab,
  className = '',
}) => {
  const isControlled = Array.isArray(controlledTabs);
  const [internalTabs, setInternalTabs] = useState<TabDefinition[]>(initialTabs);
  const currentTabs = isControlled ? controlledTabs ?? [] : internalTabs;
  const [activeId, setActiveId] = useState<string>(initialTabs[0]?.id || '');
  const prevActive = useRef<string>('');
  const dragSrc = useRef<number | null>(null);

  useEffect(() => {
    if (prevActive.current !== activeId) {
      const prev = currentTabs.find((t) => t.id === prevActive.current);
      const next = currentTabs.find((t) => t.id === activeId);
      if (prev && prev.onDeactivate) prev.onDeactivate();
      if (next && next.onActivate) next.onActivate();
      prevActive.current = activeId;
    }
  }, [activeId, currentTabs]);

  useEffect(() => {
    if (currentTabs.length === 0) {
      if (activeId !== '') setActiveId('');
      return;
    }
    if (!currentTabs.some((t) => t.id === activeId)) {
      const first = currentTabs[0];
      if (first) setActiveId(first.id);
    }
  }, [currentTabs, activeId]);

  const updateTabs = useCallback(
    (updater: (prev: TabDefinition[]) => TabDefinition[]) => {
      if (isControlled) {
        const prev = controlledTabs ?? [];
        const next = updater(prev.slice());
        onTabsChange?.(next);
        return next;
      }
      let result: TabDefinition[] = [];
      setInternalTabs((prev) => {
        const next = updater(prev.slice());
        result = next;
        onTabsChange?.(next);
        return next;
      });
      return result;
    },
    [controlledTabs, isControlled, onTabsChange],
  );

  const setActive = useCallback((id: string) => {
    setActiveId(id);
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
          if (fallback) setActiveId(fallback.id);
        } else if (next.length === 0 && onNewTab && !onDetachTab) {
          const tab = onNewTab();
          next.push(tab);
          setActiveId(tab.id);
        }
        return next;
      });
    },
    [activeId, onDetachTab, onNewTab, updateTabs],
  );

  const addTab = useCallback(() => {
    if (!onNewTab) return;
    const tab = onNewTab();
    updateTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, [onNewTab, updateTabs]);

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
    dragSrc.current = null;
    if (src === null || src === index) return;
    updateTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const detachTabAt = useCallback(
    (index: number) => {
      let removed: TabDefinition | undefined;
      updateTabs((prev) => {
        if (!prev[index]) return prev;
        const next = [...prev];
        [removed] = next.splice(index, 1);
        if (!removed) return prev;
        if (next.length === 0) {
          setActiveId('');
        } else if (removed.id === activeId) {
          const fallback = next[index] || next[index - 1];
          if (fallback) setActiveId(fallback.id);
        }
        return next;
      });
      if (removed) onDetachTab?.(removed, index);
    },
    [activeId, onDetachTab, updateTabs],
  );

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
      if (currentTabs.length === 0) return;
      const idx = currentTabs.findIndex((t) => t.id === activeId);
      const nextIdx = e.shiftKey
        ? (idx - 1 + currentTabs.length) % currentTabs.length
        : (idx + 1) % currentTabs.length;
      const nextTab = currentTabs[nextIdx];
      setActiveId(nextTab.id);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (currentTabs.length === 0) return;
      const idx = currentTabs.findIndex((t) => t.id === activeId);
      const nextIdx =
        e.key === 'ArrowLeft'
          ? (idx - 1 + currentTabs.length) % currentTabs.length
          : (idx + 1) % currentTabs.length;
      const nextTab = currentTabs[nextIdx];
      setActiveId(nextTab.id);
    }
  };

  return (
    <div
      className={`flex flex-col w-full h-full ${className}`.trim()}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-shrink-0 bg-gray-800 text-white text-sm overflow-x-auto">
        {currentTabs.map((t, i) => (
          <div
            key={t.id}
            className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none ${
              t.id === activeId ? 'bg-gray-700' : 'bg-gray-800'
            }`}
            draggable
            onDragStart={handleDragStart(i)}
            onDragOver={handleDragOver(i)}
            onDrop={handleDrop(i)}
            onDragEnd={() => {
              dragSrc.current = null;
            }}
            onClick={() => setActive(t.id)}
          >
            <span className="max-w-[150px]">{middleEllipsis(t.title)}</span>
            {t.closable !== false && currentTabs.length > 1 && (
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
        {onDetachTab && (
          <div
            className="px-3 py-1 bg-gray-800 text-xs flex items-center"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragSrc.current !== null) {
                detachTabAt(dragSrc.current);
                dragSrc.current = null;
              }
            }}
            aria-label="Detach Tab"
            role="button"
          >
            Detach
          </div>
        )}
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
        {currentTabs.map((t) => (
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
