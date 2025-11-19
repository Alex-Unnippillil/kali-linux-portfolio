import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import DelayedTooltip from '../../components/ui/DelayedTooltip';
import AppTooltipContent from '../../components/ui/AppTooltipContent';
import {
  buildAppMetadata,
  loadAppRegistry,
} from '../../lib/appRegistry';

const OVERSCAN_ROWS = 2;
const FALLBACK_GAP = 16;

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [metadata, setMetadata] = useState({});
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const [gridOffset, setGridOffset] = useState(0);
  const [gridGap, setGridGap] = useState(FALLBACK_GAP);
  const [tileSize, setTileSize] = useState({ width: 0, height: 0 });
  const gridContainerRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { apps: registry, metadata: registryMeta } = await loadAppRegistry();
      if (!isMounted) return;
      setApps(registry);
      setMetadata(registryMeta);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    handleScroll();
    handleResize();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return undefined;

    const updateMetrics = () => {
      const rect = container.getBoundingClientRect();
      setGridWidth(rect.width);
      if (typeof window !== 'undefined') {
        setGridOffset(rect.top + window.scrollY);
      } else {
        setGridOffset(rect.top);
      }
    };

    updateMetrics();

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateMetrics);
        return () => {
          window.removeEventListener('resize', updateMetrics);
        };
      }
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateMetrics();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [apps.length, query]);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return undefined;

    const updateGap = () => {
      if (typeof window === 'undefined') return;
      const style = window.getComputedStyle(node);
      const gapValue = parseFloat(style.rowGap || style.gap || '0');
      if (!Number.isNaN(gapValue)) {
        setGridGap(gapValue);
      }
    };

    updateGap();

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateGap);
        return () => {
          window.removeEventListener('resize', updateGap);
        };
      }
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateGap();
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [apps.length, query]);

  const measureTileRef = useCallback((node) => {
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setTileSize((prev) => {
      const next = { width: rect.width, height: rect.height };
      if (
        Math.abs(prev.width - next.width) > 0.5 ||
        Math.abs(prev.height - next.height) > 0.5
      ) {
        return next;
      }
      return prev;
    });
  }, []);

  const filteredApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          !app.disabled &&
          app.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [apps, query],
  );

  const virtualization = useMemo(() => {
    if (!filteredApps.length) {
      return { visibleApps: [], topSpacer: 0, bottomSpacer: 0 };
    }

    const tileHeight = tileSize.height;
    const tileWidth = tileSize.width;
    const gap = Number.isFinite(gridGap) ? gridGap : FALLBACK_GAP;
    const hasMeasurements =
      tileHeight > 0 &&
      tileWidth > 0 &&
      viewportHeight > 0 &&
      gridWidth > 0;

    if (!hasMeasurements) {
      return {
        visibleApps: filteredApps,
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }

    const columns = Math.max(
      1,
      Math.floor((gridWidth + gap) / (tileWidth + gap)),
    );
    const totalRows = Math.ceil(filteredApps.length / columns);
    if (totalRows <= 0) {
      return { visibleApps: [], topSpacer: 0, bottomSpacer: 0 };
    }

    const rowHeight = tileHeight + gap;
    const getOffsetForRow = (row) => {
      if (row <= 0) return 0;
      return tileHeight * row + gap * Math.max(0, row - 1);
    };
    const totalHeight =
      tileHeight * totalRows + gap * Math.max(0, totalRows - 1);

    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + viewportHeight;
    const gridTop = gridOffset;
    const clampedStart = Math.min(
      Math.max(0, viewportTop - gridTop),
      Math.max(0, totalHeight),
    );
    const clampedEnd = Math.min(
      Math.max(0, viewportBottom - gridTop),
      Math.max(0, totalHeight),
    );

    let startRow = Math.max(
      0,
      Math.floor(clampedStart / rowHeight) - OVERSCAN_ROWS,
    );
    let endRow = Math.min(
      totalRows,
      Math.ceil(clampedEnd / rowHeight) + OVERSCAN_ROWS,
    );

    if (endRow <= startRow) {
      endRow = Math.min(totalRows, startRow + 1);
    }

    const startIndex = startRow * columns;
    const endIndex = Math.min(filteredApps.length, endRow * columns);
    const visibleApps = filteredApps.slice(startIndex, endIndex);

    const topSpacer = getOffsetForRow(startRow);
    const bottomSpacer = Math.max(
      0,
      totalHeight - getOffsetForRow(endRow),
    );

    return {
      visibleApps,
      topSpacer,
      bottomSpacer,
    };
  }, [
    filteredApps,
    gridGap,
    gridOffset,
    gridWidth,
    scrollTop,
    tileSize.height,
    tileSize.width,
    viewportHeight,
  ]);

  const composeRefs = (tooltipRef, measurement) => (node) => {
    if (typeof tooltipRef === 'function') {
      tooltipRef(node);
    } else if (tooltipRef) {
      tooltipRef.current = node;
    }
    if (measurement) {
      measurement(node);
    }
  };

  return (
    <div className="p-4">
      <label htmlFor="app-search" className="sr-only">
        Search apps
      </label>
      <input
        id="app-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search apps"
        aria-label="Search applications"
        className="mb-4 w-full rounded border p-2"
      />
      <div ref={gridContainerRef} className="relative">
        <div
          style={{ height: `${virtualization.topSpacer}px` }}
          aria-hidden="true"
        />
        <div
          id="app-grid"
          ref={gridRef}
          tabIndex="-1"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {virtualization.visibleApps.map((app, index) => {
            const meta = metadata[app.id] ?? buildAppMetadata(app);
            return (
              <DelayedTooltip
                key={app.id}
                content={<AppTooltipContent meta={meta} />}
              >
                {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => {
                  const measurement = index === 0 ? measureTileRef : undefined;
                  return (
                    <div
                      ref={composeRefs(ref, measurement)}
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                      className="flex flex-col items-center"
                    >
                      <Link
                        href={`/apps/${app.id}`}
                        className="flex h-full w-full flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
                        aria-label={app.title}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      >
                        {app.icon && (
                          <Image
                            src={app.icon}
                            alt=""
                            width={64}
                            height={64}
                            sizes="64px"
                            className="h-16 w-16"
                          />
                        )}
                        <span className="mt-2">{app.title}</span>
                      </Link>
                    </div>
                  );
                }}
              </DelayedTooltip>
            );
          })}
        </div>
        <div
          style={{ height: `${virtualization.bottomSpacer}px` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default AppsPage;
