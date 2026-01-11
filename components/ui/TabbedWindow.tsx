import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from 'react';
import html2canvas from 'html2canvas';

import BlobManager from '../../utils/blobManager';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [overflowedIds, setOverflowedIds] = useState<string[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const tabContentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const hoverMarkRef = useRef<{ id: string; mark: string } | null>(null);
  const [hoveredTab, setHoveredTab] = useState<{ id: string; rect: DOMRect } | null>(null);
  const captureTimeouts = useRef<Map<string, number>>(new Map());
  const lastCaptureTime = useRef<Map<string, number>>(new Map());
  const panicModeRef = useRef(false);
  const blobManagerRef = useRef<BlobManager>();

  if (!blobManagerRef.current) {
    blobManagerRef.current = new BlobManager();
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readPanicMode = () => {
      try {
        const datasetValue =
          document.documentElement.dataset.panicMode ?? document.body?.dataset.panicMode;
        const stored = window.localStorage?.getItem('panic-mode');
        const enabled = datasetValue === 'true' || stored === 'true';
        panicModeRef.current = Boolean(enabled);
      } catch {
        panicModeRef.current = false;
      }
    };

    readPanicMode();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'panic-mode') {
        readPanicMode();
      }
    };

    const handlePanicEvent = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>;
      if (typeof custom.detail?.enabled === 'boolean') {
        panicModeRef.current = custom.detail.enabled;
        return;
      }
      readPanicMode();
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('panicmodechange', handlePanicEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('panicmodechange', handlePanicEvent as EventListener);
    };
  }, []);

  const captureTabPreview = useCallback(
    async (id: string) => {
      if (panicModeRef.current) return;
      const manager = blobManagerRef.current;
      if (!manager) return;
      const node = tabContentRefs.current.get(id);
      if (!node) return;

      const now =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      const lastTime = lastCaptureTime.current.get(id) ?? 0;
      if (now - lastTime < 250) return;

      const wasHidden = node.classList.contains('hidden');
      const previousVisibility = node.style.visibility;
      const previousPointerEvents = node.style.pointerEvents;
      if (wasHidden) {
        node.classList.remove('hidden');
        node.style.visibility = 'hidden';
        node.style.pointerEvents = 'none';
      }

      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

      try {
        const scale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const canvas = await html2canvas(node, {
          backgroundColor: null,
          scale,
          logging: false,
        });
        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve();
              return;
            }
            const url = manager.set(id, blob);
            lastCaptureTime.current.set(id, now);
            if (!url) {
              resolve();
              return;
            }
            setPreviewUrls((prev) => {
              if (prev[id] === url) return prev;
              return { ...prev, [id]: url };
            });
            resolve();
          }, 'image/png', 0.9);
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TabbedWindow] Failed to capture tab preview', error);
        }
      } finally {
        if (wasHidden) {
          node.classList.add('hidden');
          node.style.visibility = previousVisibility;
          node.style.pointerEvents = previousPointerEvents;
        }
      }
    },
    [],
  );

  const schedulePreviewCapture = useCallback(
    (id: string) => {
      if (panicModeRef.current) return;
      const timeout = captureTimeouts.current.get(id);
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
      const handle = window.setTimeout(() => {
        captureTimeouts.current.delete(id);
        void captureTabPreview(id);
      }, 120);
      captureTimeouts.current.set(id, handle);
    },
    [captureTabPreview],
  );

  useEffect(() => {
    if (prevActive.current !== activeId) {
      const previousId = prevActive.current;
      const prev = tabs.find((t) => t.id === previousId);
      const next = tabs.find((t) => t.id === activeId);
      if (prev && prev.onDeactivate) prev.onDeactivate();
      if (previousId) {
        schedulePreviewCapture(previousId);
      }
      if (next && next.onActivate) next.onActivate();
      prevActive.current = activeId;
    }
  }, [activeId, schedulePreviewCapture, tabs]);

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
        if (captureTimeouts.current.has(id)) {
          const timeoutHandle = captureTimeouts.current.get(id);
          if (timeoutHandle !== undefined) {
            window.clearTimeout(timeoutHandle);
          }
          captureTimeouts.current.delete(id);
        }
        if (blobManagerRef.current?.has(id)) {
          blobManagerRef.current.revoke(id);
          setPreviewUrls((prevUrls) => {
            if (!(id in prevUrls)) return prevUrls;
            const { [id]: _removed, ...rest } = prevUrls;
            return rest;
          });
        }
        lastCaptureTime.current.delete(id);
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
    const ids = new Set(tabs.map((tab) => tab.id));
    setPreviewUrls((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (ids.has(key)) {
          next[key] = value;
        } else {
          const timeoutHandle = captureTimeouts.current.get(key);
          if (timeoutHandle !== undefined) {
            window.clearTimeout(timeoutHandle);
          }
          captureTimeouts.current.delete(key);
          blobManagerRef.current?.revoke(key);
          lastCaptureTime.current.delete(key);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [tabs]);

  useEffect(() => {
    if (!hoveredTab) return;
    if (!tabs.some((tab) => tab.id === hoveredTab.id)) {
      hoverMarkRef.current = null;
      setHoveredTab(null);
    }
  }, [hoveredTab, tabs]);

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
    const timeouts = captureTimeouts.current;
    return () => {
      blobManagerRef.current?.clear();
      timeouts.forEach((handle) => {
        if (handle !== undefined) {
          window.clearTimeout(handle);
        }
      });
      timeouts.clear();
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

  const handleTabMouseEnter = useCallback(
    (id: string) => (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
        const mark = `tab-preview-hover-${id}-${performance.now().toFixed(3)}`;
        performance.mark(mark);
        hoverMarkRef.current = { id, mark };
      } else {
        hoverMarkRef.current = null;
      }
      setHoveredTab({ id, rect });
      if (!previewUrls[id]) {
        schedulePreviewCapture(id);
      }
    },
    [previewUrls, schedulePreviewCapture],
  );

  const handleTabMouseLeave = useCallback(() => {
    if (
      hoverMarkRef.current?.mark &&
      typeof performance !== 'undefined' &&
      typeof performance.clearMarks === 'function'
    ) {
      performance.clearMarks(hoverMarkRef.current.mark);
    }
    hoverMarkRef.current = null;
    setHoveredTab(null);
  }, []);

  useEffect(() => {
    if (!hoveredTab) return;
    const markEntry = hoverMarkRef.current;
    if (!markEntry || markEntry.id !== hoveredTab.id || !markEntry.mark) return;
    const url = previewUrls[hoveredTab.id];
    if (!url) return;

    if (
      typeof performance === 'undefined' ||
      typeof performance.mark !== 'function' ||
      typeof performance.measure !== 'function'
    ) {
      hoverMarkRef.current = null;
      return;
    }

    const shownMark = `tab-preview-shown-${hoveredTab.id}-${performance.now().toFixed(3)}`;
    performance.mark(shownMark);
    const measureName = `tab-preview-latency-${hoveredTab.id}-${Date.now()}`;
    try {
      const measure = performance.measure(measureName, markEntry.mark, shownMark);
      if (measure.duration > 50 && process.env.NODE_ENV === 'development') {
        console.warn(
          `[TabbedWindow] Preview tooltip latency ${measure.duration.toFixed(
            2,
          )}ms exceeded budget for tab ${hoveredTab.id}`,
        );
      }
    } catch {
      // ignore invalid measures
    } finally {
      if (typeof performance.clearMarks === 'function') {
        performance.clearMarks(markEntry.mark);
        performance.clearMarks(shownMark);
      }
      if (typeof performance.clearMeasures === 'function') {
        performance.clearMeasures(measureName);
      }
      hoverMarkRef.current = null;
    }
  }, [hoveredTab, previewUrls]);

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
                onMouseEnter={handleTabMouseEnter(t.id)}
                onMouseLeave={handleTabMouseLeave}
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
              ref={(node) => {
                if (node) {
                  tabContentRefs.current.set(t.id, node);
                } else {
                  tabContentRefs.current.delete(t.id);
                }
              }}
            >
              {t.content}
            </div>
          </TabContext.Provider>
        ))}
        {hoveredTab && (
          <div
            className="pointer-events-none fixed z-[999] -translate-x-1/2 -translate-y-full transform"
            style={{
              left: hoveredTab.rect.left + hoveredTab.rect.width / 2,
              top: hoveredTab.rect.top - 8,
            }}
          >
            <div className="rounded border border-gray-700 bg-black/80 p-2 shadow-xl backdrop-blur-sm">
              {previewUrls[hoveredTab.id] ? (
                <img
                  src={previewUrls[hoveredTab.id]}
                  alt={`${tabs.find((tab) => tab.id === hoveredTab.id)?.title || 'Tab'} preview`}
                  className="h-32 w-48 rounded object-cover"
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <div className="flex h-32 w-48 items-center justify-center text-xs text-gray-400">
                  Generating preview…
                </div>
              )}
              <div className="mt-2 max-w-[12rem] truncate text-center text-xs text-gray-200">
                {tabs.find((tab) => tab.id === hoveredTab.id)?.title ?? ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabbedWindow;
