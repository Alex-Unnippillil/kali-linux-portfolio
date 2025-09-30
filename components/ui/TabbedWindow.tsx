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
  const prevActive = useRef<string>('');
  const dragSrc = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const swipeState = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    isActive: false,
    isHorizontal: false,
  });

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

  const focusContainer = useCallback(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  const selectTab = useCallback(
    (id: string) => {
      setActiveId((prev) => {
        if (prev === id) return prev;
        return id;
      });
      focusContainer();
    },
    [focusContainer],
  );

  const goToOffset = useCallback(
    (direction: number) => {
      if (tabs.length === 0) return false;
      const currentIndex = tabs.findIndex((t) => t.id === activeId);
      const safeIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex = (safeIndex + direction + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (nextTab && nextTab.id !== activeId) {
        setActiveId(nextTab.id);
        return true;
      }
      return false;
    },
    [activeId, tabs],
  );

  const activateNext = useCallback(() => {
    if (goToOffset(1)) {
      focusContainer();
    }
  }, [focusContainer, goToOffset]);

  const activatePrevious = useCallback(() => {
    if (goToOffset(-1)) {
      focusContainer();
    }
  }, [focusContainer, goToOffset]);

  const closeTab = useCallback(
    (id: string) => {
      focusContainer();
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
    [activeId, focusContainer, onNewTab, updateTabs],
  );

  const addTab = useCallback(() => {
    if (!onNewTab) return;
    const tab = onNewTab();
    updateTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
    focusContainer();
  }, [focusContainer, onNewTab, updateTabs]);

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
      if (e.shiftKey) {
        activatePrevious();
      } else {
        activateNext();
      }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (e.key === 'ArrowLeft') {
        activatePrevious();
      } else {
        activateNext();
      }
    }
  };

  const releasePointer = useCallback(() => {
    const state = swipeState.current;
    if (state.pointerId !== null && contentRef.current) {
      try {
        contentRef.current.releasePointerCapture(state.pointerId);
      } catch {
        // ignore if capture is not set
      }
    }
    swipeState.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      isActive: false,
      isHorizontal: false,
    };
  }, []);

  const SWIPE_LOCK_THRESHOLD = 10;
  const SWIPE_ACTIVATION_DISTANCE = 80;

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    swipeState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      isActive: true,
      isHorizontal: false,
    };
    contentRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = swipeState.current;
      if (!state.isActive || state.pointerId !== e.pointerId) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      if (!state.isHorizontal) {
        if (Math.abs(dx) >= SWIPE_LOCK_THRESHOLD) {
          state.isHorizontal = Math.abs(dx) > Math.abs(dy);
        }
      }
      if (state.isHorizontal) {
        e.preventDefault();
      }
    },
    [],
  );

  const handlePointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = swipeState.current;
      if (!state.isActive || state.pointerId !== e.pointerId) return;
      const dx = e.clientX - state.startX;
      if (state.isHorizontal && Math.abs(dx) >= SWIPE_ACTIVATION_DISTANCE) {
        if (dx < 0) {
          activateNext();
        } else {
          activatePrevious();
        }
      }
      releasePointer();
    },
    [activateNext, activatePrevious, releasePointer],
  );

  const handlePointerCancel = useCallback(() => {
    releasePointer();
  }, [releasePointer]);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  useEffect(() => {
    if (tabs.length === 0) {
      if (activeId !== '') {
        setActiveId('');
      }
      return;
    }
    if (!tabs.some((t) => t.id === activeId)) {
      setActiveId(tabs[0].id);
    }
  }, [activeId, tabs]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col w-full h-full ${className}`.trim()}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-shrink-0 bg-gray-900 text-white text-sm">
        <div
          className="flex w-full overflow-x-auto gap-1 px-2 py-2 sm:py-1"
          role="tablist"
          aria-label="Window tabs"
        >
          {tabs.map((t, i) => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${t.id}`}
                tabIndex={isActive ? 0 : -1}
                className={`flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-xs sm:text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  isActive ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                } min-w-[120px] sm:min-w-[90px] shrink-0 select-none`}
                draggable
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
                onDrop={handleDrop(i)}
                onClick={() => selectTab(t.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectTab(t.id);
                  }
                }}
              >
                <span className="truncate">{middleEllipsis(t.title)}</span>
                {t.closable !== false && tabs.length > 1 && (
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
            );
          })}
          {onNewTab && (
            <button
              type="button"
              className="flex h-full items-center justify-center rounded-md bg-gray-800 px-3 py-2 text-xs sm:text-sm text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              onClick={addTab}
              aria-label="New Tab"
            >
              +
            </button>
          )}
        </div>
      </div>
      <div
        ref={contentRef}
        className="relative flex-grow overflow-hidden touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
      >
        {activeTab && (
          <TabContext.Provider
            key={activeTab.id}
            value={{ id: activeTab.id, active: true, close: () => closeTab(activeTab.id) }}
          >
            <div
              id={`tabpanel-${activeTab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab.id}`}
              className="absolute inset-0 h-full w-full"
            >
              {activeTab.content}
            </div>
          </TabContext.Provider>
        )}
      </div>
    </div>
  );
};

export default TabbedWindow;
