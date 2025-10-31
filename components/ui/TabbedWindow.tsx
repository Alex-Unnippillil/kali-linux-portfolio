import React, {
  useCallback,
  useEffect,
  useMemo,
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

interface WindowTabTitleEventDetail {
  title?: string | null;
  tabTitle?: string | null;
}

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rootRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [overflowedIds, setOverflowedIds] = useState<string[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

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

  const dispatchTabTitleEvent = useCallback(
    (detail: WindowTabTitleEventDetail) => {
      const root = rootRef.current;
      if (!root) return;
      const event = new CustomEvent<WindowTabTitleEventDetail>('desktop-window-tab-title', {
        bubbles: true,
        detail,
      });
      root.dispatchEvent(event);
    },
    [],
  );

  useEffect(() => {
    const activeTab = tabs.find((t) => t.id === activeId);
    dispatchTabTitleEvent({ tabTitle: activeTab?.title ?? null });
  }, [activeId, tabs, dispatchTabTitleEvent]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return () => {};
    return () => {
      const resetEvent = new CustomEvent<WindowTabTitleEventDetail>('desktop-window-tab-title', {
        bubbles: true,
        detail: { tabTitle: null, title: null },
      });
      root.dispatchEvent(resetEvent);
    };
  }, []);

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
      ref={rootRef}
      className={`flex h-full w-full flex-col ${className}`.trim()}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div
        className="flex flex-shrink-0 items-center gap-1 border-b border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-1 text-sm text-[color:var(--color-text)]"
      >
        {canScrollLeft && (
          <button
            type="button"
            className="h-full rounded px-2 py-1 transition-colors hover:bg-[var(--kali-panel-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
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
            className="flex overflow-x-auto scroll-smooth scrollbar-thin"
          >
            {tabs.map((t, i) => (
              <div
                key={t.id}
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
                className={`group flex flex-shrink-0 cursor-pointer select-none items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-[color:color-mix(in_srgb,var(--color-text)_92%,transparent)] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange ${
                  t.id === activeId
                    ? 'border-[color:color-mix(in_srgb,var(--color-ub-orange)_65%,transparent)] bg-ub-orange text-black shadow-inner shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'hover:border-[color:var(--kali-border)] hover:bg-[var(--kali-panel-highlight)] hover:text-[color:var(--color-text)]'
                }`}
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
              >
                <span className="max-w-[150px] whitespace-nowrap">{middleEllipsis(t.title)}</span>
                {t.closable !== false && tabs.length > 1 && (
                  <button
                    className="rounded-sm p-1 text-xs text-[color:color-mix(in_srgb,var(--color-text)_78%,transparent)] transition-colors hover:bg-[var(--kali-panel-highlight)] hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
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
          </div>
        </div>
        {canScrollRight && (
          <button
            type="button"
            className="h-full rounded px-2 py-1 transition-colors hover:bg-[var(--kali-panel-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
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
              className="rounded px-2 py-1 transition-colors hover:bg-[var(--kali-panel-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
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
                className="absolute right-0 z-10 mt-1 w-48 rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] py-1 text-[color:var(--color-text)] shadow-lg"
              >
                {overflowTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center justify-between px-3 py-1 text-left text-[color:color-mix(in_srgb,var(--color-text)_92%,transparent)] transition-colors hover:bg-[var(--kali-panel-highlight)] hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
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
            className="rounded px-2 py-1 transition-colors hover:bg-[var(--kali-panel-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
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
