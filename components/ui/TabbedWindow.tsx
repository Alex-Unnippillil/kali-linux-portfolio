import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  createContext,
  useContext,
} from 'react';
import {
  DEFAULT_CASCADE_OFFSETS,
  DEFAULT_TABBED_LAYOUT,
  getStoredTabbedLayout,
  setStoredTabbedLayout,
} from '../../utils/windowLayout';

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

type LayoutMode = 'tabs' | 'columns' | 'grid' | 'cascade';

interface LayoutPreset {
  id: LayoutMode;
  label: string;
  description: string;
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: 'tabs', label: 'Tabs', description: 'Show one tab at a time' },
  { id: 'columns', label: 'Columns', description: 'Two column layout showing all tabs' },
  { id: 'grid', label: 'Grid', description: '2×2 grid for up to four tabs' },
  { id: 'cascade', label: 'Cascade', description: 'Stack tabs with staggered offsets' },
];

const isLayoutMode = (value: string): value is LayoutMode =>
  LAYOUT_PRESETS.some((preset) => preset.id === value);

interface TabbedWindowProps {
  initialTabs: TabDefinition[];
  onNewTab?: () => TabDefinition;
  onTabsChange?: (tabs: TabDefinition[]) => void;
  className?: string;
  layoutStorageKey?: string;
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
  layoutStorageKey,
}) => {
  const [tabs, setTabs] = useState<TabDefinition[]>(initialTabs);
  const [activeId, setActiveId] = useState<string>(initialTabs[0]?.id || '');
  const [layout, setLayout] = useState<LayoutMode>(() => {
    if (!layoutStorageKey) return DEFAULT_TABBED_LAYOUT;
    const stored = getStoredTabbedLayout(layoutStorageKey, DEFAULT_TABBED_LAYOUT);
    return isLayoutMode(stored) ? stored : DEFAULT_TABBED_LAYOUT;
  });
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
  const layoutSelectId = useId();

  useEffect(() => {
    if (!layoutStorageKey) return;
    const stored = getStoredTabbedLayout(layoutStorageKey, DEFAULT_TABBED_LAYOUT);
    if (isLayoutMode(stored)) {
      setLayout(stored);
    }
  }, [layoutStorageKey]);

  useEffect(() => {
    if (!layoutStorageKey) return;
    setStoredTabbedLayout(layoutStorageKey, layout);
  }, [layout, layoutStorageKey]);

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
    if (layout !== 'tabs') return;
    focusTab(activeId);
  }, [activeId, focusTab, layout]);

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

  const layoutDescription = useMemo(
    () => LAYOUT_PRESETS.find((preset) => preset.id === layout)?.description || '',
    [layout],
  );

  const renderMultiLayoutPanel = useCallback(
    (
      tab: TabDefinition,
      _index: number,
      style?: React.CSSProperties,
      extraClassName = '',
    ) => {
      const isActive = tab.id === activeId;
      const close = () => closeTab(tab.id);
      const className = [
        'flex flex-col overflow-hidden rounded border bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-ub-orange',
        isActive ? 'border-ub-orange shadow-lg' : 'border-gray-700',
        extraClassName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      return (
        <TabContext.Provider
          key={tab.id}
          value={{ id: tab.id, active: isActive, close }}
        >
          <div
            data-testid="tabbed-window-panel"
            className={className}
            style={style}
            tabIndex={0}
            onMouseDown={() => setActive(tab.id)}
            onFocus={() => setActive(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setActive(tab.id);
              }
            }}
          >
            <div className="flex items-center justify-between bg-gray-800 px-3 py-2 text-sm font-medium">
              <span className="truncate pr-2">{tab.title}</span>
              {tab.closable !== false && (
                <button
                  type="button"
                  className="rounded px-2 py-1 text-base leading-none hover:bg-gray-700 focus:outline-none"
                  onClick={(event) => {
                    event.stopPropagation();
                    close();
                  }}
                  aria-label={`Close ${tab.title}`}
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-2">{tab.content}</div>
          </div>
        </TabContext.Provider>
      );
    },
    [activeId, closeTab, setActive],
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
                className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none flex-shrink-0 ${
                  t.id === activeId ? 'bg-gray-700' : 'bg-gray-800'
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
        <div className="flex items-center px-1">
          <label htmlFor={layoutSelectId} className="sr-only">
            Layout preset
          </label>
          <select
            id={layoutSelectId}
            value={layout}
            onChange={(event) => {
              const next = event.target.value;
              if (isLayoutMode(next)) {
                setLayout(next);
              }
            }}
            aria-label="Layout preset"
            title={layoutDescription}
            className="h-8 rounded border border-gray-700 bg-gray-900 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
          >
            {LAYOUT_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
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
      <div className="flex-grow relative overflow-hidden" data-testid="tabbed-window-content">
        {layout === 'tabs' && (
          tabs.map((t) => (
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
          ))
        )}
        {layout !== 'tabs' && (
          <div
            className="absolute inset-0 overflow-auto p-4"
            data-testid="tabbed-window-multi-layout"
            data-layout-mode={layout}
          >
            {layout === 'cascade' ? (
              <div
                className="relative min-h-full"
                style={{
                  paddingBottom: `${DEFAULT_CASCADE_OFFSETS.y * (tabs.length + 1)}px`,
                  paddingRight: `${DEFAULT_CASCADE_OFFSETS.x * (tabs.length + 1)}px`,
                }}
              >
                {tabs.map((tab, index) => {
                  const xOffset = Math.max(0, (tabs.length - index - 1) * DEFAULT_CASCADE_OFFSETS.x);
                  const yOffset = Math.max(0, (tabs.length - index - 1) * DEFAULT_CASCADE_OFFSETS.y);
                  const style: React.CSSProperties = {
                    position: 'absolute',
                    top: `${index * DEFAULT_CASCADE_OFFSETS.y}px`,
                    left: `${index * DEFAULT_CASCADE_OFFSETS.x}px`,
                    width: `calc(100% - ${xOffset}px)`,
                    height: `calc(100% - ${yOffset}px)`,
                    zIndex: index + 1,
                  };
                  return renderMultiLayoutPanel(tab, index, style, 'pointer-events-auto');
                })}
              </div>
            ) : (
              <div
                className={`grid h-full gap-4`}
                style={{
                  gridTemplateColumns:
                    layout === 'columns'
                      ? 'repeat(auto-fit, minmax(280px, 1fr))'
                      : 'repeat(auto-fit, minmax(240px, 1fr))',
                  gridAutoRows: layout === 'grid' ? 'minmax(220px, 1fr)' : undefined,
                }}
              >
                {tabs.map((tab, index) => renderMultiLayoutPanel(tab, index))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabbedWindow;
