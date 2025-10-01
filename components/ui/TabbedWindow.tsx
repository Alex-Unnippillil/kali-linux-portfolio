import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from 'react';
import DelayedTooltip from './DelayedTooltip';
import AppTooltipContent from './AppTooltipContent';

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
  const [focusedTabId, setFocusedTabId] = useState<string>(initialTabs[0]?.id || '');
  const prevActive = useRef<string>('');
  const dragSrc = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [overflowedIds, setOverflowedIds] = useState<string[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const closedTabsRef = useRef<{ tab: TabDefinition; index: number }[]>([]);
  const invokerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      invokerRef.current = activeElement;
    }
    return () => {
      const invoker = invokerRef.current;
      if (invoker && typeof invoker.focus === 'function' && document.contains(invoker)) {
        invoker.focus();
      }
    };
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

  const focusTab = useCallback(
    (id: string, { force = false }: { force?: boolean } = {}) => {
      const el = tabRefs.current.get(id);
      if (!el) return;
      if (!force) {
        const container = scrollContainerRef.current;
        if (!container) return;
        if (!container.contains(document.activeElement)) return;
      }
      setFocusedTabId(id);
      el.focus({ preventScroll: true });
    },
    [],
  );

  const setActive = useCallback(
    (id: string) => {
      setActiveId(id);
      setFocusedTabId(id);
      requestAnimationFrame(() => focusTab(id, { force: true }));
    },
    [focusTab],
  );

  const closeTab = useCallback(
    (id: string) => {
      updateTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        const removed = prev[idx];
        const next = prev.filter((t) => t.id !== id);
        if (removed) {
          closedTabsRef.current.push({ tab: removed, index: idx });
          if (closedTabsRef.current.length > 10) {
            closedTabsRef.current.shift();
          }
          if (removed.onClose) removed.onClose();
        }
        if (id === activeId && next.length > 0) {
          const fallback = next[idx] || next[idx - 1];
          setActiveId(fallback.id);
          setFocusedTabId(fallback.id);
          requestAnimationFrame(() => focusTab(fallback.id, { force: true }));
        } else if (next.length === 0 && onNewTab) {
          const tab = onNewTab();
          next.push(tab);
          setActiveId(tab.id);
          setFocusedTabId(tab.id);
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
    setFocusedTabId(tab.id);
    requestAnimationFrame(() => focusTab(tab.id, { force: true }));
  }, [focusTab, onNewTab, updateTabs]);

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

  const restoreClosedTab = useCallback(() => {
    const last = closedTabsRef.current.pop();
    if (!last) return;
    updateTabs((prev) => {
      const next = [...prev];
      const insertIndex = Math.min(last.index, next.length);
      next.splice(insertIndex, 0, last.tab);
      return next;
    });
    setActiveId(last.tab.id);
    setFocusedTabId(last.tab.id);
    requestAnimationFrame(() => focusTab(last.tab.id, { force: true }));
  }, [focusTab, updateTabs]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTab = target?.getAttribute('role') === 'tab';

    if (e.ctrlKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      closeTab(activeId);
      return;
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      restoreClosedTab();
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
        setFocusedTabId(nextTab.id);
        requestAnimationFrame(() => focusTab(nextTab.id));
        return prev;
      });
      return;
    }
    if (isTab && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const currentId = focusedTabId || activeId;
      const idx = tabs.findIndex((t) => t.id === currentId);
      if (idx === -1) return;
      const nextIdx =
        e.key === 'ArrowLeft'
          ? (idx - 1 + tabs.length) % tabs.length
          : (idx + 1) % tabs.length;
      const nextTab = tabs[nextIdx];
      setFocusedTabId(nextTab.id);
      requestAnimationFrame(() => focusTab(nextTab.id, { force: true }));
      return;
    }
    if (isTab && (e.key === 'Home' || e.key === 'End')) {
      e.preventDefault();
      const targetTab = e.key === 'Home' ? tabs[0] : tabs[tabs.length - 1];
      if (!targetTab) return;
      setFocusedTabId(targetTab.id);
      requestAnimationFrame(() => focusTab(targetTab.id, { force: true }));
    }
  };

  useEffect(() => {
    if (focusedTabId && !tabs.some((tab) => tab.id === focusedTabId)) {
      const fallback = tabs[0]?.id || '';
      setFocusedTabId(fallback);
    }
  }, [focusedTabId, tabs]);

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
          >
            {tabs.map((t, i) => {
              const tabDomId = `tab-${t.id}`;
              const panelDomId = `panel-${t.id}`;
              const isActive = t.id === activeId;
              const isFocused = t.id === focusedTabId;

              return (
                <div
                  key={t.id}
                  role="tab"
                  id={tabDomId}
                  aria-selected={isActive}
                  aria-controls={panelDomId}
                  tabIndex={isFocused ? 0 : -1}
                  ref={(node) => {
                    if (node) {
                      tabRefs.current.set(t.id, node);
                    } else {
                      tabRefs.current.delete(t.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none flex-shrink-0 transition-colors ${
                    isActive ? 'bg-gray-700' : 'bg-gray-800'
                  } focus-visible:outline focus-visible:outline-[var(--focus-outline-width)] focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)]`}
                  draggable
                  onDragStart={handleDragStart(i)}
                  onDragOver={handleDragOver(i)}
                  onDrop={handleDrop(i)}
                  onClick={() => setActive(t.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActive(t.id);
                    }
                  }}
                  onFocus={() => setFocusedTabId(t.id)}
                >
                  <span className="max-w-[150px]">{middleEllipsis(t.title)}</span>
                  {t.closable !== false && tabs.length > 1 && (
                    <DelayedTooltip
                      key={`${t.id}-close-tooltip`}
                      content={<AppTooltipContent meta={{ title: 'Close tab', keyboard: ['Ctrl+W'] }} />}
                    >
                      {({ ref, onBlur, onFocus, onMouseEnter, onMouseLeave }) => (
                        <button
                          ref={(node) => {
                            ref(node);
                          }}
                          type="button"
                          className="p-0.5 text-sm focus-visible:outline focus-visible:outline-[var(--focus-outline-width)] focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(t.id);
                          }}
                          onMouseEnter={onMouseEnter}
                          onMouseLeave={onMouseLeave}
                          onFocus={onFocus}
                          onBlur={onBlur}
                          aria-label="Close Tab"
                        >
                          ×
                        </button>
                      )}
                    </DelayedTooltip>
                  )}
                </div>
              );
            })}
          </div>
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
          <DelayedTooltip
            content={
              <AppTooltipContent
                meta={{
                  title: 'New tab',
                  keyboard: ['Ctrl+T', 'Ctrl+Shift+T (reopen)'],
                }}
              />
            }
          >
            {({ ref, onBlur, onFocus, onMouseEnter, onMouseLeave }) => (
              <button
                ref={(node) => {
                  ref(node);
                }}
                type="button"
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 focus-visible:outline focus-visible:outline-[var(--focus-outline-width)] focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)]"
                onClick={addTab}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onFocus={onFocus}
                onBlur={onBlur}
                aria-label="New Tab"
              >
                +
              </button>
            )}
          </DelayedTooltip>
        )}
      </div>
      <div className="flex-grow relative overflow-hidden">
        {tabs.map((t) => {
          const panelDomId = `panel-${t.id}`;
          const tabDomId = `tab-${t.id}`;
          return (
            <TabContext.Provider
              key={t.id}
              value={{ id: t.id, active: t.id === activeId, close: () => closeTab(t.id) }}
            >
              <div
                id={panelDomId}
                role="tabpanel"
                aria-labelledby={tabDomId}
                className={`absolute inset-0 w-full h-full ${
                  t.id === activeId ? 'block' : 'hidden'
                }`}
              >
                {t.content}
              </div>
            </TabContext.Provider>
          );
        })}
      </div>
    </div>
  );
};

export default TabbedWindow;
