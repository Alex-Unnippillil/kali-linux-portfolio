import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from 'react';
import SplitPane from './SplitPane';
import useTabLayoutStore, { DEFAULT_LAYOUT_STATE } from '../../hooks/useTabLayoutStore';
import { SettingsContext } from '../../hooks/useSettings';

function middleEllipsis(text: string, max = 30) {
  if (text.length <= max) return text;
  const half = Math.floor((max - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(text.length - half)}`;
}

export interface TabDefinition {
  id: string;
  title: string;
  content: React.ReactNode | ((pane: 'primary' | 'secondary') => React.ReactNode);
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

type PaneType = 'primary' | 'secondary';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [overflowedIds, setOverflowedIds] = useState<string[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const { getLayout, updateLayout, removeLayout } = useTabLayoutStore();
  const { reducedMotion } = useContext(SettingsContext);
  const paneRefs = useRef<
    Map<string, { primary: HTMLDivElement | null; secondary: HTMLDivElement | null }>
  >(new Map());
  const paneClassName =
    'h-full w-full overflow-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-focus-ring] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900';
  const activeLayout = useMemo(
    () => (activeId ? getLayout(activeId) : DEFAULT_LAYOUT_STATE),
    [activeId, getLayout],
  );

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeId) ?? null,
    [tabs, activeId],
  );

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

  const setPaneRef = useCallback(
    (tabId: string, pane: PaneType) =>
      (node: HTMLDivElement | null) => {
        const entry = paneRefs.current.get(tabId) ?? { primary: null, secondary: null };
        entry[pane] = node;
        if (!entry.primary && !entry.secondary) {
          paneRefs.current.delete(tabId);
        } else {
          paneRefs.current.set(tabId, entry);
        }
      },
    [],
  );

  const setActive = useCallback(
    (id: string) => {
      setActiveId(id);
    },
    [],
  );

  const focusPane = useCallback(
    (pane: PaneType) => {
      if (!activeId) return;
      const entry = paneRefs.current.get(activeId);
      const target = entry?.[pane];
      target?.focus({ preventScroll: false });
    },
    [activeId],
  );

  const handleSizeChange = useCallback(
    (tabId: string) => (next: number) => {
      if (!Number.isFinite(next)) return;
      updateLayout(tabId, { size: next });
    },
    [updateLayout],
  );

  const toggleSplit = useCallback(() => {
    if (!activeId) return;
    updateLayout(activeId, (current) => ({
      ...current,
      split: !current.split,
      ...(current.split ? { linkScroll: false } : {}),
    }));
  }, [activeId, updateLayout]);

  const toggleOrientation = useCallback(() => {
    if (!activeId) return;
    updateLayout(activeId, (current) => ({
      ...current,
      orientation: current.orientation === 'horizontal' ? 'vertical' : 'horizontal',
    }));
  }, [activeId, updateLayout]);

  const toggleLinkScroll = useCallback(() => {
    if (!activeId) return;
    updateLayout(activeId, (current) => ({
      ...current,
      linkScroll: !current.linkScroll,
    }));
  }, [activeId, updateLayout]);

  const renderPaneContent = useCallback(
    (tab: TabDefinition, pane: PaneType) => {
      const { content } = tab;
      if (typeof content === 'function') {
        return content(pane);
      }
      if (React.isValidElement(content)) {
        return React.cloneElement(content, { key: `${tab.id}-${pane}` });
      }
      return content;
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
        removeLayout(id);
        paneRefs.current.delete(id);
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
    [activeId, focusTab, onNewTab, removeLayout, updateTabs],
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

  useEffect(() => {
    if (!activeId) return;
    if (!activeLayout.split || !activeLayout.linkScroll) return;
    const entry = paneRefs.current.get(activeId);
    const primary = entry?.primary;
    const secondary = entry?.secondary;
    if (!primary || !secondary) return;

    let syncing = false;
    const sync = (source: HTMLDivElement, target: HTMLDivElement) => () => {
      if (syncing) return;
      syncing = true;
      const top = source.scrollTop;
      const left = source.scrollLeft;
      if (typeof target.scrollTo === 'function') {
        target.scrollTo({
          top,
          left,
          behavior: reducedMotion ? 'auto' : 'smooth',
        });
      } else {
        target.scrollTop = top;
        target.scrollLeft = left;
      }
      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const handlePrimary = sync(primary, secondary);
    const handleSecondary = sync(secondary, primary);

    primary.addEventListener('scroll', handlePrimary, { passive: true });
    secondary.addEventListener('scroll', handleSecondary, { passive: true });

    return () => {
      primary.removeEventListener('scroll', handlePrimary);
      secondary.removeEventListener('scroll', handleSecondary);
    };
  }, [activeId, activeLayout.linkScroll, activeLayout.split, reducedMotion]);

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
        <div className="flex items-center gap-1 pr-2">
          {onNewTab && (
            <button
              type="button"
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 focus:outline-none"
              onClick={addTab}
              aria-label="New Tab"
            >
              +
            </button>
          )}
          <button
            type="button"
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onClick={toggleSplit}
            aria-label="Toggle split view"
            aria-pressed={activeLayout.split}
            disabled={!activeTab}
          >
            Split view
          </button>
          <button
            type="button"
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onClick={toggleOrientation}
            aria-label="Toggle split orientation"
            disabled={!activeTab || !activeLayout.split}
          >
            {activeLayout.orientation === 'horizontal' ? 'Stack panes' : 'Side by side'}
          </button>
          <button
            type="button"
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onClick={toggleLinkScroll}
            aria-label="Link pane scrolling"
            aria-pressed={activeLayout.linkScroll}
            disabled={!activeTab || !activeLayout.split}
          >
            Link scroll
          </button>
          {activeLayout.split && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => focusPane('primary')}
                aria-label={
                  activeTab ? `Focus ${activeTab.title} pane 1` : 'Focus pane 1'
                }
                disabled={!activeTab}
              >
                Focus pane 1
              </button>
              <button
                type="button"
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => focusPane('secondary')}
                aria-label={
                  activeTab ? `Focus ${activeTab.title} pane 2` : 'Focus pane 2'
                }
                disabled={!activeTab}
              >
                Focus pane 2
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-grow relative overflow-hidden">
        {tabs.map((t) => {
          const layout = getLayout(t.id);
          const paneOneLabel = `${t.title} pane 1`;
          const paneTwoLabel = `${t.title} pane 2`;
          const primaryRef = setPaneRef(t.id, 'primary');
          const secondaryRef = setPaneRef(t.id, 'secondary');

          return (
            <TabContext.Provider
              key={t.id}
              value={{ id: t.id, active: t.id === activeId, close: () => closeTab(t.id) }}
            >
              <div
                className={`absolute inset-0 w-full h-full ${
                  t.id === activeId ? 'block' : 'hidden'
                }`}
              >
                {layout.split ? (
                  <SplitPane
                    orientation={layout.orientation}
                    size={layout.size}
                    onSizeChange={handleSizeChange(t.id)}
                    firstPaneProps={{
                      ref: primaryRef,
                      tabIndex: 0,
                      role: 'region',
                      'aria-label': paneOneLabel,
                      className: paneClassName,
                    }}
                    secondPaneProps={{
                      ref: secondaryRef,
                      tabIndex: 0,
                      role: 'region',
                      'aria-label': paneTwoLabel,
                      className: paneClassName,
                    }}
                  >
                    {renderPaneContent(t, 'primary')}
                    {renderPaneContent(t, 'secondary')}
                  </SplitPane>
                ) : (
                  <div
                    ref={primaryRef}
                    tabIndex={0}
                    role="region"
                    aria-label={`${t.title} pane`}
                    className={paneClassName}
                  >
                    {renderPaneContent(t, 'primary')}
                  </div>
                )}
              </div>
            </TabContext.Provider>
          );
        })}
      </div>
    </div>
  );
};

export default TabbedWindow;
