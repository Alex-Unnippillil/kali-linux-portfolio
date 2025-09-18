'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AppTabDefinition, DraggedTabPayload } from '../../types/apps';

const DRAG_MIME = 'application/x-kali-tab';

const dragRegistry = new Map<string, DraggedTabPayload>();

function registerDrag(payload: DraggedTabPayload) {
  const dragId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  dragRegistry.set(dragId, payload);
  return dragId;
}

function takeDrag(dragId: string) {
  const payload = dragRegistry.get(dragId);
  if (payload) dragRegistry.delete(dragId);
  return payload;
}

interface DragData {
  dragId: string;
  sourceWindowId: string;
}

function parseDragData(event: React.DragEvent): DragData | null {
  const raw = event.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DragData;
    return typeof data.dragId === 'string' && typeof data.sourceWindowId === 'string'
      ? data
      : null;
  } catch {
    return null;
  }
}

interface TabbedTitlebarProps {
  windowId: string;
  tabs: AppTabDefinition[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onReorder: (tabId: string, beforeTabId?: string) => void;
  onDropExternal: (payload: DraggedTabPayload, beforeTabId?: string) => void;
  requestDetach: (payload: DraggedTabPayload) => void;
  requestNewTab?: () => void;
  getDragPayload: (tabId: string) => DraggedTabPayload | null;
}

export default function TabbedTitlebar({
  windowId,
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onReorder,
  onDropExternal,
  requestDetach,
  requestNewTab,
  getDragPayload,
}: TabbedTitlebarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overflowButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const currentDragRef = useRef<{ tabId: string; dragId: string } | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const tabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      setHasOverflow(node.scrollWidth > node.clientWidth + 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [tabs]);

  useEffect(() => {
    if (!overflowOpen) return;
    const handlePointer = (event: MouseEvent) => {
      const menu = menuRef.current;
      const trigger = overflowButtonRef.current;
      if (!menu || !trigger) return;
      if (!menu.contains(event.target as Node) && !trigger.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [overflowOpen]);

  const focusRelativeTab = useCallback(
    (direction: number) => {
      if (!tabIds.length) return;
      const currentIndex = tabIds.indexOf(activeTabId);
      const nextIndex = (currentIndex + direction + tabIds.length) % tabIds.length;
      onSelect(tabIds[nextIndex]);
    },
    [activeTabId, onSelect, tabIds],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!tabIds.length) return;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          focusRelativeTab(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          focusRelativeTab(1);
          break;
        case 'Home':
          event.preventDefault();
          onSelect(tabIds[0]);
          break;
        case 'End':
          event.preventDefault();
          onSelect(tabIds[tabIds.length - 1]);
          break;
        default:
          break;
      }
    },
    [focusRelativeTab, onSelect, tabIds],
  );

  const handleDragStart = useCallback(
    (tabId: string) => (event: React.DragEvent) => {
      const payload = getDragPayload(tabId);
      if (!payload) {
        event.preventDefault();
        return;
      }
      const dragId = registerDrag(payload);
      currentDragRef.current = { tabId, dragId };
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(
        DRAG_MIME,
        JSON.stringify({ dragId, sourceWindowId: payload.sourceWindowId }),
      );
    },
    [getDragPayload],
  );

  const handleDragEnd = useCallback(
    (event: React.DragEvent) => {
      const entry = currentDragRef.current;
      currentDragRef.current = null;
      if (!entry) return;
      if (event.dataTransfer.dropEffect === 'none') {
        const payload = takeDrag(entry.dragId);
        if (payload && payload.onDetach) {
          requestDetach(payload);
        }
      } else {
        takeDrag(entry.dragId);
      }
    },
    [requestDetach],
  );

  const handleDrop = useCallback(
    (beforeTabId?: string) => (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const data = parseDragData(event);
      if (!data) return;
      const payload = takeDrag(data.dragId);
      if (!payload) return;
      if (payload.sourceWindowId === windowId) {
        const sourceId = payload.tab.id;
        if (sourceId !== beforeTabId) {
          onReorder(sourceId, beforeTabId);
        }
      } else {
        onDropExternal(payload, beforeTabId);
      }
    },
    [onDropExternal, onReorder, windowId],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex items-center gap-1 bg-gray-900 text-gray-100 px-2 py-1" onKeyDown={handleKeyDown}>
      <div
        ref={containerRef}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
        role="tablist"
        aria-label="Window tabs"
        onDragOver={handleDragOver}
        onDrop={handleDrop()}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex max-w-[180px] items-center rounded px-3 py-1 text-sm transition-colors ${
              tab.id === activeTabId ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300'
            }`}
            role="tab"
            aria-selected={tab.id === activeTabId}
            tabIndex={tab.id === activeTabId ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(tab.id);
              }
            }}
            draggable
            onDragStart={handleDragStart(tab.id)}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop(tab.id)}
            onDragOver={handleDragOver}
            data-tab-id={tab.id}
          >
            <span className="truncate" title={tab.title}>
              {tab.title}
            </span>
            {tab.closable !== false && (
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.id);
                }}
                aria-label={`Close ${tab.title}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {requestNewTab && (
        <button
          type="button"
          className="rounded bg-gray-800 px-2 py-1 text-sm text-gray-200 hover:bg-gray-700"
          onClick={requestNewTab}
          aria-label="New tab"
        >
          +
        </button>
      )}
      {hasOverflow && (
        <div className="relative">
          <button
            type="button"
            ref={overflowButtonRef}
            className="rounded bg-gray-800 px-2 py-1 text-sm text-gray-200 hover:bg-gray-700"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen((open) => !open)}
          >
            ⋯
          </button>
          {overflowOpen && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-gray-700 bg-gray-900 py-1 shadow-lg"
            >
              {tabs.map((tab) => (
                <Fragment key={`overflow-${tab.id}`}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`flex w-full items-center justify-between px-3 py-1 text-left text-sm ${
                      tab.id === activeTabId ? 'bg-gray-700 text-white' : 'text-gray-200 hover:bg-gray-800'
                    }`}
                    onClick={() => {
                      onSelect(tab.id);
                      setOverflowOpen(false);
                    }}
                  >
                    <span className="truncate" title={tab.title}>
                      {tab.title}
                    </span>
                    {tab.closable !== false && <span aria-hidden="true">×</span>}
                  </button>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
