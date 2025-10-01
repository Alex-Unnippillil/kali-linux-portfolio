'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from 'react';
import usePersistentState from '../../hooks/usePersistentState';

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
  storageKey?: string;
}

interface TabContextValue {
  id: string;
  active: boolean;
  close: () => void;
}

const TabContext = createContext<TabContextValue>({ id: '', active: false, close: () => {} });
export const useTab = () => useContext(TabContext);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

interface DragSnapshot {
  sourceId: string;
  dropIndex: number;
  method: 'pointer' | 'html';
}

const TabbedWindow: React.FC<TabbedWindowProps> = ({
  initialTabs,
  onNewTab,
  onTabsChange,
  className = '',
  storageKey,
}) => {
  const persistenceKey = storageKey ?? 'tabbed-window';
  const orderKey = `${persistenceKey}:order`;
  const [storedOrder, setStoredOrder] = usePersistentState<string[]>(
    orderKey,
    () => initialTabs.map((tab) => tab.id),
    isStringArray,
  );
  const orderedInitialTabs = useMemo(() => {
    const lookup = new Map(initialTabs.map((tab) => [tab.id, tab]));
    const ordered = storedOrder
      .map((id) => lookup.get(id))
      .filter((tab): tab is TabDefinition => Boolean(tab));
    const seen = new Set(ordered.map((tab) => tab.id));
    const missing = initialTabs.filter((tab) => !seen.has(tab.id));
    return [...ordered, ...missing];
  }, [initialTabs, storedOrder]);
  const [tabs, setTabs] = useState<TabDefinition[]>(orderedInitialTabs);
  const [activeId, setActiveId] = useState<string>(initialTabs[0]?.id || '');
  const prevActive = useRef<string>('');
  const dragSrc = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [overflowedIds, setOverflowedIds] = useState<string[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragSnapshot | null>(null);
  const pointerDrag = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    moved: boolean;
  } | null>(null);
  const [liveMessage, setLiveMessage] = useState('');

  useEffect(() => {
    setTabs(orderedInitialTabs);
  }, [orderedInitialTabs]);

  useEffect(() => {
    if (!liveMessage) return;
    if (typeof window === 'undefined') return;
    const timeout = window.setTimeout(() => setLiveMessage(''), 1000);
    return () => window.clearTimeout(timeout);
  }, [liveMessage]);

  useEffect(() => {
    if (prevActive.current !== activeId) {
      const prev = tabs.find((t) => t.id === prevActive.current);
      const next = tabs.find((t) => t.id === activeId);
      if (prev && prev.onDeactivate) prev.onDeactivate();
      if (next && next.onActivate) next.onActivate();
      prevActive.current = activeId;
    }
  }, [activeId, tabs]);

  const applyTabs = useCallback(
    (next: TabDefinition[], announcement?: string) => {
      onTabsChange?.(next);
      setStoredOrder(next.map((tab) => tab.id));
      if (announcement) {
        setLiveMessage(announcement);
      }
      return next;
    },
    [onTabsChange, setStoredOrder],
  );

  const updateTabs = useCallback(
    (updater: (prev: TabDefinition[]) => TabDefinition[]) => {
      setTabs((prev) => applyTabs(updater(prev)));
    },
    [applyTabs],
  );

  const reorderTabs = useCallback(
    (sourceId: string, destinationIndex: number) => {
      setTabs((prev) => {
        const safeDestination = Math.min(Math.max(destinationIndex, 0), prev.length);
        const sourceIndex = prev.findIndex((tab) => tab.id === sourceId);
        if (sourceIndex === -1) return prev;
        if (safeDestination === sourceIndex || safeDestination === sourceIndex + 1) {
          return prev;
        }
        const next = [...prev];
        const [moved] = next.splice(sourceIndex, 1);
        const insertionIndex = safeDestination > sourceIndex ? safeDestination - 1 : safeDestination;
        next.splice(insertionIndex, 0, moved);
        const finalIndex = next.findIndex((tab) => tab.id === moved.id);
        const announcement = `${middleEllipsis(moved.title)} moved to position ${finalIndex + 1} of ${next.length}.`;
        return applyTabs(next, announcement);
      });
    },
    [applyTabs],
  );

  const endDrag = useCallback(() => {
    dragSrc.current = null;
    setDragState(null);
    pointerDrag.current = null;
  }, []);

  const updateDropIndicator = useCallback(
    (dropIndex: number, sourceId: string, method: 'pointer' | 'html') => {
      setDragState((prev) => {
        if (prev && prev.dropIndex === dropIndex && prev.sourceId === sourceId && prev.method === method) {
          return prev;
        }
        return { sourceId, dropIndex, method };
      });
    },
    [],
  );

  const getDropIndexFromClientX = useCallback(
    (clientX: number) => {
      const container = scrollContainerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      if (!rect) return null;
      const relativeX = clientX - rect.left + container.scrollLeft;
      if (Number.isNaN(relativeX)) return null;
      for (let i = 0; i < tabs.length; i += 1) {
        const tab = tabs[i];
        const el = tabRefs.current.get(tab.id);
        if (!el) continue;
        const left = el.offsetLeft;
        const width = el.offsetWidth;
        if (relativeX < left + width / 2) {
          return i;
        }
      }
      return tabs.length;
    },
    [tabs],
  );

  const focusTab = useCallback((id: string, { force = false } = {}) => {
    const el = tabRefs.current.get(id);
    if (!el) return;
    if (!force) {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (!container.contains(document.activeElement)) return;
    }
    el.focus({ preventScroll: true });
  }, []);

  const setActive = useCallback(
    (id: string) => {
      setActiveId(id);
    },
    [],
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
          requestAnimationFrame(() => focusTab(fallback.id, { force: true }));
        } else if (next.length === 0 && onNewTab) {
          const tab = onNewTab();
          next.push(tab);
          setActiveId(tab.id);
        }
        return next;
      });
    },
    [activeId, focusTab, onNewTab, updateTabs],
  );

  const addTab = useCallback(() => {
    if (!onNewTab) return;
    const tab = onNewTab();
    updateTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, [onNewTab, updateTabs]);

  const handleDragStart = (tabId: string, index: number) => (e: React.DragEvent) => {
    dragSrc.current = tabId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', tabId);
      } catch {
        // ignore browsers that disallow setData in this context
      }
    }
    updateDropIndicator(index, tabId, 'html');
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const sourceId = dragState?.sourceId ?? dragSrc.current;
    if (!sourceId) return;
    const nextIndex = getDropIndexFromClientX(e.clientX) ?? index;
    updateDropIndicator(nextIndex, sourceId, 'html');
  };

  const handleDrop = (fallbackIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = dragState?.sourceId ?? dragSrc.current;
    if (!sourceId) {
      endDrag();
      return;
    }
    const destinationIndex = dragState?.dropIndex ?? getDropIndexFromClientX(e.clientX) ?? fallbackIndex;
    reorderTabs(sourceId, destinationIndex);
    endDrag();
  };

  const handleDragEnd = () => {
    endDrag();
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dragSrc.current && !dragState) return;
    e.preventDefault();
    const sourceId = dragState?.sourceId ?? dragSrc.current;
    if (!sourceId) return;
    const nextIndex = getDropIndexFromClientX(e.clientX);
    if (nextIndex === null) return;
    updateDropIndicator(nextIndex, sourceId, 'html');
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dragSrc.current && !dragState) return;
    e.preventDefault();
    e.stopPropagation();
    const sourceId = dragState?.sourceId ?? dragSrc.current;
    if (!sourceId) {
      endDrag();
      return;
    }
    const nextIndex = dragState?.dropIndex ?? getDropIndexFromClientX(e.clientX) ?? tabs.length;
    reorderTabs(sourceId, nextIndex);
    endDrag();
  };

  const handlePointerDown = (tabId: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (typeof e.button === 'number' && e.button !== 0) return;
    pointerDrag.current = {
      id: tabId,
      pointerId: e.pointerId,
      startX: e.clientX,
      moved: false,
    };
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore pointer capture errors
      }
    }
  };

  const handlePointerMove = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const info = pointerDrag.current;
    if (!info || info.pointerId !== e.pointerId) return;
    const dropIndex = getDropIndexFromClientX(e.clientX) ?? index;
    if (!info.moved) {
      if (Math.abs(e.clientX - info.startX) < 4) {
        return;
      }
      info.moved = true;
      updateDropIndicator(dropIndex, info.id, 'pointer');
    } else {
      e.preventDefault();
      updateDropIndicator(dropIndex, info.id, 'pointer');
    }
  };

  const finishPointerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const info = pointerDrag.current;
    if (!info || info.pointerId !== e.pointerId) return;
    if (info.moved) {
      const destinationIndex = dragState?.dropIndex ?? getDropIndexFromClientX(e.clientX) ?? tabs.length;
      reorderTabs(info.id, destinationIndex);
    }
    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore pointer capture errors
      }
    }
    endDrag();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    finishPointerDrag(e);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const info = pointerDrag.current;
    if (!info || info.pointerId !== e.pointerId) return;
    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore pointer capture errors
      }
    }
    endDrag();
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
        requestAnimationFrame(() => focusTab(nextTab.id));
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
        requestAnimationFrame(() => focusTab(nextTab.id));
        return prev;
      });
    }
  };

  const updateOverflow = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const visibleLeft = container.scrollLeft;
    const visibleRight = visibleLeft + container.clientWidth;
    setCanScrollLeft(visibleLeft > 0);
    setCanScrollRight(visibleRight < container.scrollWidth - 1);
    const hidden: string[] = [];
    tabs.forEach((tab) => {
      const el = tabRefs.current.get(tab.id);
      if (!el) return;
      const left = el.offsetLeft;
      const right = left + el.offsetWidth;
      if (left < visibleLeft || right > visibleRight) {
        hidden.push(tab.id);
      }
    });
    setOverflowedIds(hidden);
  }, [tabs]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => updateOverflow();
    updateOverflow();
    container.addEventListener('scroll', handleScroll);
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateOverflow()) : null;
    observer?.observe(container);
    window.addEventListener('resize', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      observer?.disconnect();
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateOverflow]);

  useEffect(() => {
    const id = requestAnimationFrame(() => updateOverflow());
    return () => cancelAnimationFrame(id);
  }, [activeId, tabs, updateOverflow]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const activeEl = tabRefs.current.get(activeId);
    if (!container || !activeEl) return;
    const left = activeEl.offsetLeft;
    const right = left + activeEl.offsetWidth;
    const visibleLeft = container.scrollLeft;
    const visibleRight = visibleLeft + container.clientWidth;
    if (left < visibleLeft) {
      container.scrollTo({ left, behavior: 'smooth' });
    } else if (right > visibleRight) {
      container.scrollTo({ left: right - container.clientWidth, behavior: 'smooth' });
    }
  }, [activeId]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreButtonRef.current?.contains(target)) return;
      if (moreMenuRef.current?.contains(target)) return;
      setMoreMenuOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [moreMenuOpen]);

  useEffect(() => {
    focusTab(activeId);
  }, [activeId, focusTab]);

  const overflowTabs = useMemo(() => {
    if (overflowedIds.length === 0) return [] as TabDefinition[];
    const overflowSet = new Set(overflowedIds);
    return tabs.filter((tab) => overflowSet.has(tab.id));
  }, [overflowedIds, tabs]);

  useEffect(() => {
    if (overflowTabs.length === 0 && moreMenuOpen) {
      setMoreMenuOpen(false);
    }
  }, [moreMenuOpen, overflowTabs.length]);

  const scrollByAmount = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const amount = container.clientWidth * 0.6;
    container.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  const handleMoreSelect = useCallback(
    (id: string) => {
      setMoreMenuOpen(false);
      setActive(id);
      requestAnimationFrame(() => focusTab(id, { force: true }));
    },
    [focusTab, setActive],
  );

  return (
    <div
      className={`flex flex-col w-full h-full ${className}`.trim()}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-shrink-0 items-center gap-1 bg-gray-800 text-white text-sm">
        {canScrollLeft && (
          <button
            type="button"
            className="px-2 py-1 h-full bg-gray-800 hover:bg-gray-700 focus:outline-none"
            onClick={() => scrollByAmount('left')}
            aria-label="Scroll tabs left"
          >
            ‹
          </button>
        )}
        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            role="tablist"
            aria-orientation="horizontal"
            className="flex overflow-x-auto scrollbar-thin scroll-smooth"
            onDragOver={handleContainerDragOver}
            onDrop={handleContainerDrop}
          >
            {tabs.map((t, i) => (
              <React.Fragment key={t.id}>
                <DropIndicator active={Boolean(dragState) && dragState.dropIndex === i} />
                <div
                  role="tab"
                  aria-selected={t.id === activeId}
                  tabIndex={t.id === activeId ? 0 : -1}
                  ref={(node) => {
                    if (node) {
                      tabRefs.current.set(t.id, node);
                    } else {
                      tabRefs.current.delete(t.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none flex-shrink-0 transition-colors ${
                    t.id === activeId ? 'bg-gray-700' : 'bg-gray-800'
                  } ${dragState?.sourceId === t.id ? 'ring-2 ring-ub-orange' : ''}`.trim()}
                  draggable
                  onDragStart={handleDragStart(t.id, i)}
                  onDragOver={handleDragOver(i)}
                  onDrop={handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  onPointerDown={handlePointerDown(t.id)}
                  onPointerMove={handlePointerMove(i)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onClick={() => setActive(t.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActive(t.id);
                    }
                  }}
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
              </React.Fragment>
            ))}
            <DropIndicator active={Boolean(dragState) && dragState.dropIndex === tabs.length} />
          </div>
        </div>
        <div role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
        {canScrollRight && (
          <button
            type="button"
            className="px-2 py-1 h-full bg-gray-800 hover:bg-gray-700 focus:outline-none"
            onClick={() => scrollByAmount('right')}
            aria-label="Scroll tabs right"
          >
            ›
          </button>
        )}
        {overflowTabs.length > 0 && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              ref={moreButtonRef}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 focus:outline-none"
              onClick={() => setMoreMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
            >
              More ▾
            </button>
            {moreMenuOpen && (
              <div
                ref={moreMenuRef}
                role="menu"
                className="absolute right-0 z-10 mt-1 w-48 rounded border border-gray-700 bg-gray-900 py-1 shadow-lg"
              >
                {overflowTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center justify-between px-3 py-1 text-left hover:bg-gray-700"
                    onClick={() => handleMoreSelect(tab.id)}
                  >
                    <span className="truncate">{tab.title}</span>
                    {tab.id === activeId && <span className="ml-2 text-xs text-ub-orange">Active</span>}
                  </button>
                ))}
              </div>
            )}
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

interface DropIndicatorProps {
  active: boolean;
}

const DropIndicator: React.FC<DropIndicatorProps> = ({ active }) => (
  <div
    aria-hidden="true"
    data-testid="tab-drop-indicator"
    data-active={active ? 'true' : 'false'}
    className="pointer-events-none flex w-2 justify-center"
  >
    <span
      className={`h-6 w-0.5 rounded-full bg-ub-orange transition-all duration-150 ease-out ${
        active ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
      }`}
    />
  </div>
);
