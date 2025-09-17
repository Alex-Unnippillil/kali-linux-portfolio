import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid as VirtualGrid, type CellComponentProps, type GridImperativeAPI } from 'react-window';
import UbuntuApp from '../base/ubuntu_app';

const ROW_HEIGHT = 112;

const COLUMN_BREAKPOINTS: Array<{ minWidth: number; columns: number }> = [
  { minWidth: 1024, columns: 8 },
  { minWidth: 768, columns: 6 },
  { minWidth: 640, columns: 4 },
];

type ScreenLike =
  | (((...args: any[]) => unknown) & { prefetch?: () => void })
  | { prefetch?: () => void }
  | null;

export type AppTile = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  displayName?: ReactNode;
  prefetch?: () => void;
  screen?: ScreenLike;
};

interface VirtualizedApp extends AppTile {
  renderedLabel: ReactNode;
}

interface GridProps {
  apps: AppTile[];
  openApp?: (id: string) => void;
  className?: string;
  initialQuery?: string;
}

interface CellProps {
  apps: VirtualizedApp[];
  columnCount: number;
  openApp?: (id: string) => void;
}

const getColumnCount = (width: number): number => {
  for (const breakpoint of COLUMN_BREAKPOINTS) {
    if (width >= breakpoint.minWidth) {
      return breakpoint.columns;
    }
  }
  return 3;
};

const getPrefetch = (app: VirtualizedApp): (() => void) | undefined => {
  if (typeof app.prefetch === 'function') {
    return app.prefetch;
  }
  if (typeof app.screen === 'function' && typeof app.screen.prefetch === 'function') {
    return app.screen.prefetch.bind(app.screen);
  }
  if (typeof app.screen === 'object' && app.screen !== null && 'prefetch' in app.screen) {
    const maybePrefetch = (app.screen as { prefetch?: () => void }).prefetch;
    if (typeof maybePrefetch === 'function') {
      return maybePrefetch;
    }
  }
  return undefined;
};

const highlightQuery = (text: string, query: string): { matched: boolean; nodes: ReactNode[] } => {
  const trimmed = query.trim();
  if (!trimmed) {
    return { matched: true, nodes: [text] };
  }

  const q = trimmed.toLowerCase();
  let qi = 0;
  const nodes: ReactNode[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (qi < q.length && ch.toLowerCase() === q[qi]) {
      nodes.push(
        <mark key={i} className="rounded-sm bg-yellow-400/40 px-0.5 text-inherit">
          {ch}
        </mark>,
      );
      qi += 1;
    } else {
      nodes.push(ch);
    }
  }

  return { matched: qi === q.length, nodes };
};

const VirtualCell = ({
  columnIndex,
  rowIndex,
  style,
  apps,
  columnCount,
  openApp,
}: CellComponentProps<CellProps>) => {
  const index = rowIndex * columnCount + columnIndex;
  const app = apps[index];

  if (!app) {
    return null;
  }

  const prefetch = getPrefetch(app);

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <UbuntuApp
        id={app.id}
        icon={app.icon}
        name={app.title}
        displayName={<>{app.renderedLabel}</>}
        openApp={() => openApp?.(app.id)}
        disabled={app.disabled}
        prefetch={prefetch}
      />
    </div>
  );
};

const Grid = ({ apps, openApp, className = '', initialQuery = '' }: GridProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridRef = useRef<GridImperativeAPI | null>(null);
  const columnCountRef = useRef(1);
  const scrollRafRef = useRef<number | null>(null);
  const focusRafRef = useRef<number | null>(null);

  const normalizedApps = useMemo<VirtualizedApp[]>(
    () =>
      apps.map((app) => ({
        ...app,
        renderedLabel: app.displayName ?? app.title,
      })),
    [apps],
  );

  const filteredApps = useMemo<VirtualizedApp[]>(() => {
    if (!query.trim()) {
      return normalizedApps;
    }

    return normalizedApps.reduce<VirtualizedApp[]>((acc, app) => {
      const { matched, nodes } = highlightQuery(app.title, query);
      if (!matched) {
        return acc;
      }
      acc.push({
        ...app,
        renderedLabel: nodes,
      });
      return acc;
    }, []);
  }, [normalizedApps, query]);

  useEffect(() => {
    setFocusedIndex((prev) => {
      if (filteredApps.length === 0) {
        return 0;
      }
      return Math.min(prev, filteredApps.length - 1);
    });
  }, [filteredApps.length]);

  useEffect(() => () => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    if (focusRafRef.current !== null) {
      cancelAnimationFrame(focusRafRef.current);
    }
  }, []);

  const scheduleScrollToCell = useCallback((rowIndex: number, columnIndex: number) => {
    if (!gridRef.current) {
      return;
    }
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      gridRef.current?.scrollToCell({
        behavior: 'auto',
        columnAlign: 'smart',
        columnIndex,
        rowAlign: 'smart',
        rowIndex,
      });
    });
  }, []);

  const focusTile = useCallback((appId?: string) => {
    if (!appId || typeof window === 'undefined') {
      return;
    }
    if (focusRafRef.current !== null) {
      cancelAnimationFrame(focusRafRef.current);
    }
    focusRafRef.current = requestAnimationFrame(() => {
      const element = document.getElementById(`app-${appId}`);
      element?.focus();
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        return;
      }
      if (filteredApps.length === 0) {
        return;
      }

      event.preventDefault();
      const columnCount = columnCountRef.current || 1;
      let nextIndex = focusedIndex;

      if (event.key === 'ArrowRight') {
        nextIndex = Math.min(focusedIndex + 1, filteredApps.length - 1);
      } else if (event.key === 'ArrowLeft') {
        nextIndex = Math.max(focusedIndex - 1, 0);
      } else if (event.key === 'ArrowDown') {
        nextIndex = Math.min(focusedIndex + columnCount, filteredApps.length - 1);
      } else if (event.key === 'ArrowUp') {
        nextIndex = Math.max(focusedIndex - columnCount, 0);
      }

      if (nextIndex === focusedIndex) {
        return;
      }

      setFocusedIndex(nextIndex);
      const rowIndex = Math.floor(nextIndex / columnCount);
      const columnIndex = nextIndex % columnCount;
      scheduleScrollToCell(rowIndex, columnIndex);
      focusTile(filteredApps[nextIndex]?.id);
    },
    [filteredApps, focusedIndex, focusTile, scheduleScrollToCell],
  );

  const containerClassName = [
    'flex h-full w-full flex-col items-center px-4 pb-10 text-white',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const resultsMessage = useMemo(() => {
    if (filteredApps.length === 0) {
      return 'No applications match your search.';
    }
    if (filteredApps.length === 1) {
      return 'Showing 1 application.';
    }
    return `Showing ${filteredApps.length} applications.`;
  }, [filteredApps.length]);

  return (
    <div className={containerClassName}>
      <label htmlFor="app-grid-search" className="sr-only">
        Search applications
      </label>
      <input
        id="app-grid-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search"
        aria-label="Search applications"
        className="mt-10 mb-6 w-2/3 rounded bg-black/30 px-4 py-2 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-ub-orange md:w-1/3"
      />
      <p aria-live="polite" className="sr-only" role="status">
        {resultsMessage}
      </p>
      <div className="w-full flex-1 min-h-0 max-w-6xl" onKeyDown={handleKeyDown}>
        <AutoSizer>
          {({ height, width }) => {
            if (height === 0 || width === 0) {
              return null;
            }

            if (filteredApps.length === 0) {
              return (
                <div
                  style={{ height, width }}
                  className="flex items-center justify-center text-white/60"
                >
                  No applications found
                </div>
              );
            }

            const columnCount = getColumnCount(width);
            columnCountRef.current = columnCount;
            const rowCount = Math.ceil(filteredApps.length / columnCount);

            return (
              <VirtualGrid
                gridRef={gridRef}
                columnCount={columnCount}
                columnWidth={width / columnCount}
                rowCount={rowCount}
                rowHeight={ROW_HEIGHT}
                defaultHeight={height}
                defaultWidth={width}
                overscanCount={2}
                className="scroll-smooth"
                style={{ height, width }}
                cellComponent={VirtualCell}
                cellProps={{
                  apps: filteredApps,
                  columnCount,
                  openApp,
                }}
              />
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
};

export default Grid;
