import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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

const OVERFLOW_ITEM_ESTIMATE = 36;
const OVERFLOW_VIRTUAL_OVERSCAN = 4;

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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [overflowedIds, setOverflowedIds] = useState<string[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const overflowItemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [overflowMenuHeight, setOverflowMenuHeight] = useState(0);
  const [overflowMenuScrollTop, setOverflowMenuScrollTop] = useState(0);
  const [overflowItemHeight, setOverflowItemHeight] = useState(OVERFLOW_ITEM_ESTIMATE);
  const [focusedOverflowIndex, setFocusedOverflowIndex] = useState<number | null>(null);
  const pendingOverflowFocus = useRef<number | null>(null);

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

  const overflowTabs = useMemo(() => {
    if (overflowedIds.length === 0) return [] as TabDefinition[];
    const overflowSet = new Set(overflowedIds);
    return tabs.filter((tab) => overflowSet.has(tab.id));
  }, [overflowedIds, tabs]);

  const totalOverflowTabs = overflowTabs.length;

  const virtualOverflow = useMemo(() => {
    if (totalOverflowTabs === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        paddingTop: 0,
        paddingBottom: 0,
        items: [] as Array<{ tab: TabDefinition; index: number }>,
      };
    }

    const itemHeight = overflowItemHeight || OVERFLOW_ITEM_ESTIMATE;
    const containerHeight = overflowMenuHeight || 0;
    const visibleCount = containerHeight
      ? Math.ceil(containerHeight / itemHeight) + OVERFLOW_VIRTUAL_OVERSCAN * 2
      : totalOverflowTabs;

    let startIndex = Math.max(0, Math.floor(overflowMenuScrollTop / itemHeight) - OVERFLOW_VIRTUAL_OVERSCAN);
    let endIndex = Math.min(totalOverflowTabs, startIndex + visibleCount);

    if (endIndex - startIndex < visibleCount && endIndex < totalOverflowTabs) {
      startIndex = Math.max(0, endIndex - visibleCount);
    }

    const paddingTop = startIndex * itemHeight;
    const paddingBottom = Math.max(0, (totalOverflowTabs - endIndex) * itemHeight);
    const items = overflowTabs.slice(startIndex, endIndex).map((tab, offset) => ({
      tab,
      index: startIndex + offset,
    }));

    return { startIndex, endIndex, paddingTop, paddingBottom, items };
  }, [overflowItemHeight, overflowMenuHeight, overflowMenuScrollTop, overflowTabs, totalOverflowTabs]);

  useEffect(() => {
    if (overflowTabs.length === 0 && moreMenuOpen) {
      setMoreMenuOpen(false);
    }
  }, [moreMenuOpen, overflowTabs.length]);

  useLayoutEffect(() => {
    if (!moreMenuOpen) return;
    const menu = moreMenuRef.current;
    if (!menu) return;

    const updateHeight = () => {
      const height = menu.clientHeight;
      if (height !== overflowMenuHeight) {
        setOverflowMenuHeight(height);
      }
    };

    updateHeight();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            updateHeight();
          })
        : null;

    observer?.observe(menu);

    const handleScroll = () => {
      setOverflowMenuScrollTop(menu.scrollTop);
    };

    menu.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer?.disconnect();
      menu.removeEventListener('scroll', handleScroll);
    };
  }, [moreMenuOpen, overflowMenuHeight]);

  const ensureOverflowItemVisible = useCallback(
    (index: number) => {
      if (!moreMenuRef.current) return;
      const menu = moreMenuRef.current;
      const itemHeight = overflowItemHeight || OVERFLOW_ITEM_ESTIMATE;
      const containerHeight = overflowMenuHeight || menu.clientHeight || 0;
      const top = index * itemHeight;
      const bottom = top + itemHeight;

      if (top < menu.scrollTop) {
        menu.scrollTop = top;
      } else if (bottom > menu.scrollTop + containerHeight) {
        menu.scrollTop = bottom - containerHeight;
      }
    },
    [overflowItemHeight, overflowMenuHeight],
  );

  const requestOverflowFocus = useCallback(
    (index: number, { scroll = true }: { scroll?: boolean } = {}) => {
      if (index < 0 || index >= totalOverflowTabs) return;
      setFocusedOverflowIndex(index);
      pendingOverflowFocus.current = index;
      if (scroll) {
        ensureOverflowItemVisible(index);
      }
    },
    [ensureOverflowItemVisible, totalOverflowTabs],
  );

  useLayoutEffect(() => {
    if (pendingOverflowFocus.current == null) return;
    const node = overflowItemRefs.current.get(pendingOverflowFocus.current);
    if (node) {
      node.focus();
      pendingOverflowFocus.current = null;
    }
  }, [virtualOverflow]);

  const registerOverflowItem = useCallback(
    (index: number, node: HTMLButtonElement | null) => {
      if (node) {
        overflowItemRefs.current.set(index, node);
        const rect = node.getBoundingClientRect();
        if (rect.height && Math.abs(rect.height - overflowItemHeight) > 0.5) {
          setOverflowItemHeight(rect.height);
        }
      } else {
        overflowItemRefs.current.delete(index);
      }
    },
    [overflowItemHeight],
  );

  const handleOverflowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (totalOverflowTabs === 0) return;
      const lastIndex = totalOverflowTabs - 1;
      const pageJump =
        overflowMenuHeight && overflowItemHeight
          ? Math.max(1, Math.floor(overflowMenuHeight / overflowItemHeight))
          : 5;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          requestOverflowFocus(Math.min(lastIndex, index + 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          requestOverflowFocus(Math.max(0, index - 1));
          break;
        case 'Home':
          event.preventDefault();
          requestOverflowFocus(0);
          break;
        case 'End':
          event.preventDefault();
          requestOverflowFocus(lastIndex);
          break;
        case 'PageDown':
          event.preventDefault();
          requestOverflowFocus(Math.min(lastIndex, index + pageJump));
          break;
        case 'PageUp':
          event.preventDefault();
          requestOverflowFocus(Math.max(0, index - pageJump));
          break;
        default:
          break;
      }
    },
    [overflowItemHeight, overflowMenuHeight, requestOverflowFocus, totalOverflowTabs],
  );

  useEffect(() => {
    if (!moreMenuOpen) {
      setFocusedOverflowIndex(null);
      pendingOverflowFocus.current = null;
      return;
    }

    if (totalOverflowTabs === 0) {
      setFocusedOverflowIndex(null);
      pendingOverflowFocus.current = null;
      return;
    }

    const menu = moreMenuRef.current;
    if (menu) {
      menu.scrollTop = 0;
      setOverflowMenuScrollTop(0);
    }

    const activeIndex = overflowTabs.findIndex((tab) => tab.id === activeId);
    const targetIndex = activeIndex >= 0 ? activeIndex : 0;
    requestOverflowFocus(targetIndex);
  }, [activeId, moreMenuOpen, overflowTabs, requestOverflowFocus, totalOverflowTabs]);

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
                    ? 'border-[color:color-mix(in_srgb,var(--color-ub-orange)_65%,transparent)] bg-ub-orange bg-gray-700 text-black shadow-inner shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
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
                <div
                  style={{
                    paddingTop: virtualOverflow.paddingTop,
                    paddingBottom: virtualOverflow.paddingBottom,
                  }}
                  className="flex flex-col"
                >
                  {virtualOverflow.items.map(({ tab, index }) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="menuitem"
                      ref={(node) => registerOverflowItem(index, node)}
                      tabIndex={
                        focusedOverflowIndex === null
                          ? index === 0
                            ? 0
                            : -1
                          : focusedOverflowIndex === index
                          ? 0
                          : -1
                      }
                      className="flex w-full items-center justify-between px-3 py-1 text-left text-[color:color-mix(in_srgb,var(--color-text)_92%,transparent)] transition-colors hover:bg-[var(--kali-panel-highlight)] hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
                      onMouseDown={() => requestOverflowFocus(index, { scroll: false })}
                      onFocus={() => setFocusedOverflowIndex(index)}
                      onKeyDown={(event) => handleOverflowKeyDown(event, index)}
                      onClick={() => handleMoreSelect(tab.id)}
                    >
                      <span className="truncate">{tab.title}</span>
                      {tab.id === activeId && <span className="ml-2 text-xs text-ub-orange">Active</span>}
                    </button>
                  ))}
                </div>
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
