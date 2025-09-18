'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type OverviewWindowMeta = {
  id: string;
  title: string;
  icon?: string | null;
  isFocused?: boolean;
};

interface WindowOverviewProps {
  windows: OverviewWindowMeta[];
  initialFocusId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

type LayoutEntry = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  translateX: number;
  translateY: number;
  scale: number;
};

type Snapshot = {
  transform: string;
  transition: string;
  opacity: string;
  pointerEvents: string;
  zIndex: string;
  willChange: string;
  transformOrigin: string;
};

const ENTRY_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EXIT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const GAP = 32;

function computeLayout(
  entries: Array<{
    id: string;
    rect: DOMRect;
  }>,
  viewportWidth: number,
  viewportHeight: number,
): LayoutEntry[] {
  if (!entries.length || viewportWidth === 0 || viewportHeight === 0) {
    return [];
  }

  const count = entries.length;
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);

  const availableWidth = viewportWidth - GAP * (columns + 1);
  const availableHeight = viewportHeight - GAP * (rows + 1);

  const rawTileWidth = (availableWidth > 0 ? availableWidth : viewportWidth) / columns;
  const rawTileHeight = (availableHeight > 0 ? availableHeight : viewportHeight) / rows;

  const tileWidth = Math.max(160, rawTileWidth);
  const tileHeight = Math.max(120, rawTileHeight);

  return entries.map((entry, index) => {
    const rectWidth = Math.max(entry.rect.width, 1);
    const rectHeight = Math.max(entry.rect.height, 1);
    const col = index % columns;
    const row = Math.floor(index / columns);

    const targetX = GAP + col * (tileWidth + GAP);
    const targetY = GAP + row * (tileHeight + GAP);

    const targetCenterX = targetX + tileWidth / 2;
    const targetCenterY = targetY + tileHeight / 2;

    const currentCenterX = entry.rect.left + rectWidth / 2;
    const currentCenterY = entry.rect.top + rectHeight / 2;

    const translateX = targetCenterX - currentCenterX;
    const translateY = targetCenterY - currentCenterY;
    const scale = Math.min(tileWidth / rectWidth, tileHeight / rectHeight, 1);

    return {
      id: entry.id,
      x: targetX,
      y: targetY,
      width: tileWidth,
      height: tileHeight,
      translateX,
      translateY,
      scale,
    };
  });
}

function restoreElement(
  element: HTMLElement,
  snapshot: Snapshot | undefined,
): void {
  element.style.transition = snapshot?.transition || '';
  element.style.transform = snapshot?.transform || '';
  element.style.opacity = snapshot?.opacity || '';
  element.style.pointerEvents = snapshot?.pointerEvents || '';
  element.style.zIndex = snapshot?.zIndex || '';
  element.style.willChange = snapshot?.willChange || '';
  element.style.transformOrigin = snapshot?.transformOrigin || '';
}

const WindowOverview: React.FC<WindowOverviewProps> = ({
  windows,
  initialFocusId,
  onSelect,
  onClose,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [orderedWindows, setOrderedWindows] = useState<OverviewWindowMeta[]>([]);
  const [layout, setLayout] = useState<LayoutEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const reduceMotionRef = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const snapshotsRef = useRef<Record<string, Snapshot>>({});
  const timersRef = useRef<Record<string, number>>({});
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const value = media.matches;
      reduceMotionRef.current = value;
      setReduceMotion(value);
    };
    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    if (typeof media.addListener === 'function') {
      media.addListener(update);
      return () => media.removeListener(update);
    }
    return undefined;
  }, []);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((timer) => {
      if (typeof window !== 'undefined') {
        window.clearTimeout(timer);
      }
    });
    timersRef.current = {};
  }, []);

  useEffect(() => {
    Object.values(timersRef.current).forEach((timer) => {
      if (typeof window !== 'undefined') {
        window.clearTimeout(timer);
      }
    });
    timersRef.current = {};

    if (typeof document === 'undefined') {
      return;
    }

    const overlay = overlayRef.current;
    const viewportWidth = overlay?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
    const viewportHeight = overlay?.clientHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 0);

    const entries = windows
      .map((win) => {
        const element = document.getElementById(win.id) as HTMLElement | null;
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        return { win, element, rect };
      })
      .filter(Boolean) as Array<{
        win: OverviewWindowMeta;
        element: HTMLElement;
        rect: DOMRect;
      }>;

    if (!entries.length) {
      setOrderedWindows([]);
      setLayout([]);
      return;
    }

    const computedLayout = computeLayout(
      entries.map(({ win, rect }) => ({ id: win.id, rect })),
      viewportWidth,
      viewportHeight,
    );

    setOrderedWindows(entries.map(({ win }) => win));
    setLayout(computedLayout);

    const entryDuration = reduceMotion ? 80 : 320;

    entries.forEach((entry, index) => {
      const layoutEntry = computedLayout[index];
      if (!layoutEntry) return;
      const { element, win } = entry;
      const snapshot: Snapshot = {
        transform: element.style.transform,
        transition: element.style.transition,
        opacity: element.style.opacity,
        pointerEvents: element.style.pointerEvents,
        zIndex: element.style.zIndex,
        willChange: element.style.willChange,
        transformOrigin: element.style.transformOrigin,
      };
      snapshotsRef.current[win.id] = snapshot;

      element.style.pointerEvents = 'none';
      element.style.willChange = 'transform, opacity';
      element.style.transformOrigin = 'center center';
      element.style.transition = `transform ${entryDuration}ms ${ENTRY_EASE}, opacity ${entryDuration}ms ${ENTRY_EASE}`;
      element.style.transform = `translate3d(${layoutEntry.translateX.toFixed(2)}px, ${layoutEntry.translateY.toFixed(2)}px, 0) scale(${layoutEntry.scale.toFixed(4)})`;
      element.style.opacity = win.isFocused ? '1' : '0.88';
      element.style.zIndex = '60';
    });

    return () => {
      entries.forEach((entry) => {
        const { element, win } = entry;
        const snapshot = snapshotsRef.current[win.id];
        const exitDuration = reduceMotionRef.current ? 80 : 260;
        element.style.transition = `transform ${exitDuration}ms ${EXIT_EASE}, opacity ${exitDuration}ms ${EXIT_EASE}`;
        element.style.transform = snapshot?.transform || '';
        element.style.opacity = snapshot?.opacity || '';
        element.style.pointerEvents = snapshot?.pointerEvents || '';
        element.style.zIndex = snapshot?.zIndex || '';
        element.style.willChange = snapshot?.willChange || '';
        element.style.transformOrigin = snapshot?.transformOrigin || '';

        const timer = window.setTimeout(() => {
          restoreElement(element, snapshot);
          delete timersRef.current[win.id];
          delete snapshotsRef.current[win.id];
        }, exitDuration);
        timersRef.current[win.id] = timer;
      });
    };
  }, [windows, reduceMotion]);

  useEffect(() => {
    if (!orderedWindows.length) {
      setSelectedIndex(0);
      return;
    }
    if (initialFocusId) {
      const targetIndex = orderedWindows.findIndex((win) => win.id === initialFocusId);
      if (targetIndex !== -1) {
        setSelectedIndex(targetIndex);
        return;
      }
    }
    setSelectedIndex((prev) => Math.min(prev, orderedWindows.length - 1));
  }, [orderedWindows, initialFocusId]);

  useEffect(() => {
    if (!orderedWindows.length) return;
    const currentId = orderedWindows[selectedIndex]?.id;
    if (!currentId) return;
    const node = tileRefs.current.get(currentId);
    node?.focus({ preventScroll: true });
  }, [orderedWindows, selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!orderedWindows.length) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % orderedWindows.length);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + orderedWindows.length) % orderedWindows.length);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const columns = Math.ceil(Math.sqrt(orderedWindows.length));
        setSelectedIndex((prev) => Math.min(prev + columns, orderedWindows.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const columns = Math.ceil(Math.sqrt(orderedWindows.length));
        setSelectedIndex((prev) => Math.max(prev - columns, 0));
      } else if (event.key === 'Tab') {
        event.preventDefault();
        setSelectedIndex((prev) => {
          const dir = event.shiftKey ? -1 : 1;
          return (prev + dir + orderedWindows.length) % orderedWindows.length;
        });
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const current = orderedWindows[selectedIndex];
        if (current) {
          onSelect(current.id);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderedWindows, selectedIndex, onClose, onSelect]);

  const layoutMap = useMemo(() => {
    const map = new Map<string, LayoutEntry>();
    layout.forEach((entry) => map.set(entry.id, entry));
    return map;
  }, [layout]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const registerTile = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (!node) {
      tileRefs.current.delete(id);
      return;
    }
    tileRefs.current.set(id, node);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Window overview"
      data-testid="window-overview"
      className="fixed inset-0 z-[70] flex flex-col bg-slate-900/80 backdrop-blur-md px-8 pt-12 pb-8"
      onClick={handleOverlayClick}
    >
      <div ref={overlayRef} className="relative flex-1">
        <ul className="absolute inset-0 m-0 list-none p-0">
          {orderedWindows.map((win, index) => {
            const metrics = layoutMap.get(win.id);
            if (!metrics) return null;
            const isSelected = index === selectedIndex;
            return (
              <li
                key={win.id}
                className="absolute"
                style={{
                  left: `${metrics.x}px`,
                  top: `${metrics.y}px`,
                  width: `${metrics.width}px`,
                  height: `${metrics.height}px`,
                }}
              >
                <button
                  ref={(node) => registerTile(win.id, node)}
                  type="button"
                  data-testid={`overview-tile-${win.id}`}
                  className={
                    'pointer-events-auto relative flex h-full w-full flex-col items-center justify-end rounded-2xl border border-white/10 bg-black/40 text-white shadow-xl transition-colors focus:outline-none focus:ring-2 focus:ring-ub-orange ' +
                    (isSelected ? 'ring-2 ring-ub-orange border-ub-orange bg-black/50' : 'hover:bg-white/10')
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(win.id);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onFocus={() => setSelectedIndex(index)}
                  aria-label={`Focus ${win.title}`}
                  aria-selected={isSelected}
                >
                  <span className="pointer-events-none mb-3 rounded bg-black/60 px-3 py-1 text-sm font-medium text-white shadow">
                    {win.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="pointer-events-none mt-6 text-center text-sm text-white/80">
        Use arrow keys to choose a window. Press Enter to focus or Escape to close. Toggle overview with ⌘⇧Space,
        Ctrl+Alt+↑, or F9.
      </div>
    </div>
  );
};

export default WindowOverview;
