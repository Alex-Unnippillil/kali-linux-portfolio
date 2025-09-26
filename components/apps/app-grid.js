import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';

function fuzzyHighlight(text, query) {
  const q = query.toLowerCase();
  let qi = 0;
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (qi < q.length && ch.toLowerCase() === q[qi]) {
      result.push(<mark key={i}>{ch}</mark>);
      qi++;
    } else {
      result.push(ch);
    }
  }
  return { matched: qi === q.length, nodes: result };
}

export default function AppGrid({ openApp }) {
  const [query, setQuery] = useState('');
  const parentRef = useRef(null);
  const columnCountRef = useRef(1);
  const scrollToIndexRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!query) return apps.map((app) => ({ ...app, nodes: app.title }));
    return apps
      .map((app) => {
        const { matched, nodes } = fuzzyHighlight(app.title, query);
        return matched ? { ...app, nodes } : null;
      })
      .filter(Boolean);
  }, [query]);

  useEffect(() => {
    if (focusedIndex >= filtered.length) {
      setFocusedIndex(0);
    }
  }, [filtered, focusedIndex]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const updateWidth = () => {
      const width = el.clientWidth;
      setContainerWidth((prev) => (prev === width ? prev : width));
    };
    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      setContainerWidth((prev) => (prev === width ? prev : width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getColumnCount = (width) => {
    if (width >= 1024) return 8;
    if (width >= 768) return 6;
    if (width >= 640) return 4;
    return 3;
  };

  const columnCount = useMemo(() => getColumnCount(containerWidth), [containerWidth]);
  columnCountRef.current = columnCount;
  const rowCount = useMemo(
    () => (columnCount > 0 ? Math.ceil(filtered.length / columnCount) : 0),
    [filtered.length, columnCount]
  );

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 112,
    overscan: 3,
  });

  useEffect(() => {
    scrollToIndexRef.current = (index) => {
      if (!filtered.length) return;
      const target = Math.floor(index / columnCountRef.current);
      rowVirtualizer.scrollToIndex(target, { align: 'nearest' });
    };
  }, [filtered.length, rowVirtualizer]);

  useEffect(() => {
    if (!filtered.length) {
      rowVirtualizer.scrollToOffset(0);
      return;
    }
    const rowIndex = Math.floor(focusedIndex / columnCountRef.current);
    rowVirtualizer.scrollToIndex(rowIndex, { align: 'nearest' });
  }, [focusedIndex, filtered.length, rowVirtualizer]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (!filtered.length) return;
      e.preventDefault();
      const colCount = columnCountRef.current;
      let idx = focusedIndex;
      if (e.key === 'ArrowRight') idx = Math.min(idx + 1, filtered.length - 1);
      if (e.key === 'ArrowLeft') idx = Math.max(idx - 1, 0);
      if (e.key === 'ArrowDown') idx = Math.min(idx + colCount, filtered.length - 1);
      if (e.key === 'ArrowUp') idx = Math.max(idx - colCount, 0);
      setFocusedIndex(idx);
      scrollToIndexRef.current?.(idx);
      setTimeout(() => {
        const targetApp = filtered[idx];
        if (!targetApp) return;
        const el = document.getElementById('app-' + targetApp.id);
        el?.focus();
      }, 0);
    },
    [filtered, focusedIndex]
  );

  return (
    <div className="flex flex-col items-center h-full">
      <input
        className="mb-6 mt-4 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div
        ref={parentRef}
        className="w-full flex-1 h-[70vh] overflow-y-auto outline-none scroll-smooth"
        onKeyDown={handleKeyDown}
      >
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * columnCountRef.current;
            const items = [];
            for (let columnIndex = 0; columnIndex < columnCountRef.current; columnIndex++) {
              const index = startIndex + columnIndex;
              if (index >= filtered.length) {
                items.push(
                  <div key={`empty-${virtualRow.index}-${columnIndex}`} />
                );
                continue;
              }
              const app = filtered[index];
              items.push(
                <div
                  key={app.id}
                  className={`flex justify-center items-center p-3 ${index === focusedIndex ? 'ring-2 ring-ubb-orange rounded' : ''}`}
                >
                  <UbuntuApp
                    id={app.id}
                    icon={app.icon}
                    name={app.title}
                    displayName={<>{app.nodes}</>}
                    openApp={() => openApp && openApp(app.id)}
                  />
                </div>
              );
            }
            return (
              <div
                key={virtualRow.key}
                className="grid gap-2"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columnCountRef.current}, minmax(0, 1fr))`,
                }}
              >
                {items}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
