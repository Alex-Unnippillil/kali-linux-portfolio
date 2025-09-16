'use client';

import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export const WINDOW_DRAG_TYPE = 'application/x-kali-desktop-window';
export const WINDOW_DRAG_JSON = 'application/x-kali-desktop-window+json';
export const WINDOW_DRAG_PLAIN_PREFIX = 'desktop-window:';

type CreateDesktopResult = { id: string } | string | null | undefined;

export interface WindowThumbnail {
  id: string;
  title: string;
  preview?: string | null;
  appId?: string;
}

export interface DesktopSummary {
  id: string;
  name: string;
  windows: WindowThumbnail[];
}

export interface DesktopSwitcherProps {
  desktops: DesktopSummary[];
  activeDesktopId?: string;
  onSelectDesktop?: (desktopId: string) => void | Promise<void>;
  onMoveWindow?: (windowId: string, targetDesktopId: string) => void | Promise<void>;
  onCreateDesktop?: (options: { windowId?: string }) =>
    | CreateDesktopResult
    | Promise<CreateDesktopResult>;
  className?: string;
  emptyLabel?: string;
}

type DataTransferTypes = DOMStringList | string[] | undefined;

function listHasType(list: DataTransferTypes, value: string): boolean {
  if (!list) return false;
  if (Array.isArray(list)) {
    return list.includes(value);
  }
  if (typeof list.contains === 'function') {
    return list.contains(value);
  }
  for (let i = 0; i < list.length; i += 1) {
    if (list.item(i) === value) {
      return true;
    }
  }
  return false;
}

function resolveDesktopId(result: CreateDesktopResult): string | null {
  if (!result) return null;
  if (typeof result === 'string') return result;
  if (typeof result === 'object' && 'id' in result && typeof result.id === 'string') {
    return result.id;
  }
  return null;
}

export function getWindowIdFromDataTransfer(dataTransfer: DataTransfer | null): string | null {
  if (!dataTransfer) return null;
  if (listHasType(dataTransfer.types, WINDOW_DRAG_TYPE)) {
    const raw = dataTransfer.getData(WINDOW_DRAG_TYPE);
    return raw || null;
  }
  if (listHasType(dataTransfer.types, WINDOW_DRAG_JSON)) {
    try {
      const payload = JSON.parse(dataTransfer.getData(WINDOW_DRAG_JSON));
      if (payload && typeof payload.windowId === 'string') {
        return payload.windowId;
      }
      if (payload && typeof payload.id === 'string') {
        return payload.id;
      }
    } catch (error) {
      console.error('Failed to parse desktop drag payload', error);
    }
  }
  if (listHasType(dataTransfer.types, 'text/plain')) {
    try {
      const plain = dataTransfer.getData('text/plain');
      if (plain.startsWith(WINDOW_DRAG_PLAIN_PREFIX)) {
        return plain.slice(WINDOW_DRAG_PLAIN_PREFIX.length);
      }
    } catch (error) {
      // Some browsers restrict reading arbitrary formats during drag.
    }
  }
  return null;
}

export function isWindowThumbnailTransfer(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  if (listHasType(dataTransfer.types, WINDOW_DRAG_TYPE)) return true;
  if (listHasType(dataTransfer.types, WINDOW_DRAG_JSON)) return true;
  if (listHasType(dataTransfer.types, 'text/plain')) {
    try {
      const plain = dataTransfer.getData('text/plain');
      return plain.startsWith(WINDOW_DRAG_PLAIN_PREFIX);
    } catch (error) {
      return false;
    }
  }
  return false;
}

const MAX_WINDOW_THUMBNAILS = 6;

const DesktopSwitcher: React.FC<DesktopSwitcherProps> = ({
  desktops,
  activeDesktopId,
  onSelectDesktop,
  onMoveWindow,
  onCreateDesktop,
  className = '',
  emptyLabel = 'No desktops yet',
}) => {
  const [hoveredDesktop, setHoveredDesktop] = useState<string | null>(null);
  const [newDesktopPreview, setNewDesktopPreview] = useState(false);
  const newDesktopDragDepth = useRef(0);

  const resetDragState = useCallback(() => {
    newDesktopDragDepth.current = 0;
    setNewDesktopPreview(false);
    setHoveredDesktop(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleDragEnd = () => resetDragState();
    window.addEventListener('dragend', handleDragEnd);
    window.addEventListener('drop', handleDragEnd);
    return () => {
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('drop', handleDragEnd);
    };
  }, [resetDragState]);

  const handleSelectDesktop = useCallback(
    async (desktopId: string) => {
      if (!onSelectDesktop) return;
      await onSelectDesktop(desktopId);
    },
    [onSelectDesktop],
  );

  const handleDesktopDragEnter = useCallback(
    (desktopId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
      if (!isWindowThumbnailTransfer(event.dataTransfer)) return;
      event.preventDefault();
      setHoveredDesktop(desktopId);
    },
    [],
  );

  const handleDesktopDragOver = useCallback(
    (desktopId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
      if (!isWindowThumbnailTransfer(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      if (hoveredDesktop !== desktopId) {
        setHoveredDesktop(desktopId);
      }
    },
    [hoveredDesktop],
  );

  const handleDesktopDragLeave = useCallback(
    (desktopId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
      if (!isWindowThumbnailTransfer(event.dataTransfer)) return;
      const nextTarget = event.relatedTarget as Node | null;
      if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
        setHoveredDesktop((prev) => (prev === desktopId ? null : prev));
      }
    },
    [],
  );

  const handleDesktopDrop = useCallback(
    (desktopId: string) => async (event: React.DragEvent<HTMLButtonElement>) => {
      if (!isWindowThumbnailTransfer(event.dataTransfer)) return;
      event.preventDefault();
      setHoveredDesktop(null);
      const windowId = getWindowIdFromDataTransfer(event.dataTransfer);
      if (!windowId) return;
      if (onMoveWindow) {
        await onMoveWindow(windowId, desktopId);
      }
      if (onSelectDesktop) {
        await onSelectDesktop(desktopId);
      }
    },
    [onMoveWindow, onSelectDesktop],
  );

  const handleNewDesktopDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onCreateDesktop) return;
      if (!isWindowThumbnailTransfer(event.dataTransfer)) return;
      event.preventDefault();
      newDesktopDragDepth.current += 1;
      setNewDesktopPreview(true);
    },
    [onCreateDesktop],
  );

  const handleNewDesktopDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onCreateDesktop) return;
      if (!isWindowThumbnailTransfer(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
      if (!newDesktopPreview) {
        setNewDesktopPreview(true);
      }
    },
    [newDesktopPreview, onCreateDesktop],
  );

  const handleNewDesktopDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onCreateDesktop) return;
      if (!isWindowThumbnailTransfer(event.dataTransfer)) return;
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && event.currentTarget.contains(nextTarget)) {
        return;
      }
      newDesktopDragDepth.current = Math.max(0, newDesktopDragDepth.current - 1);
      if (newDesktopDragDepth.current === 0) {
        setNewDesktopPreview(false);
      }
    },
    [onCreateDesktop],
  );

  const handleNewDesktopDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      if (!onCreateDesktop) return;
      if (!isWindowThumbnailTransfer(event.dataTransfer)) return;
      event.preventDefault();
      newDesktopDragDepth.current = 0;
      setNewDesktopPreview(false);
      const windowId = getWindowIdFromDataTransfer(event.dataTransfer);
      if (!windowId) return;
      const created = await onCreateDesktop({ windowId });
      const newDesktopId = resolveDesktopId(created);
      if (!newDesktopId) return;
      if (onMoveWindow) {
        await onMoveWindow(windowId, newDesktopId);
      }
      if (onSelectDesktop) {
        await onSelectDesktop(newDesktopId);
      }
    },
    [onCreateDesktop, onMoveWindow, onSelectDesktop],
  );

  return (
    <div className={`desktop-switcher flex flex-wrap gap-3 p-4 text-ubt-grey ${className}`.trim()}>
      {desktops.length === 0 && (
        <div className="flex h-32 w-48 flex-col items-center justify-center rounded-md border border-white/10 bg-black/30 text-center text-sm">
          {emptyLabel}
        </div>
      )}
      {desktops.map((desktop) => {
        const isActive = desktop.id === activeDesktopId;
        const isHovered = hoveredDesktop === desktop.id;
        const style: CSSProperties = {};
        if (isActive) {
          style.borderColor = 'var(--color-accent)';
        }
        if (isHovered) {
          style.boxShadow = '0 0 0 2px var(--color-accent)';
        }
        const windows = desktop.windows.slice(0, MAX_WINDOW_THUMBNAILS);
        return (
          <button
            key={desktop.id}
            type="button"
            className="group relative flex h-32 w-48 flex-col justify-between rounded-md border border-white/20 bg-black/40 p-3 text-left text-xs transition-all duration-150 hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            style={style}
            onClick={() => handleSelectDesktop(desktop.id)}
            onDragEnter={handleDesktopDragEnter(desktop.id)}
            onDragOver={handleDesktopDragOver(desktop.id)}
            onDragLeave={handleDesktopDragLeave(desktop.id)}
            onDrop={handleDesktopDrop(desktop.id)}
            data-testid={`desktop-switcher-${desktop.id}`}
          >
            <div className="flex items-center justify-between text-ubt-grey text-opacity-90">
              <span className="truncate text-sm font-medium" title={desktop.name}>
                {desktop.name}
              </span>
              {isActive && <span className="text-[10px] uppercase">Active</span>}
            </div>
            <div className="mt-2 grid flex-1 grid-cols-3 gap-1">
              {windows.map((win) => (
                <div
                  key={win.id}
                  className="flex h-10 items-center justify-center overflow-hidden rounded bg-black/40 px-1 text-[10px] text-ubt-grey text-opacity-80"
                  title={win.title}
                >
                  {win.preview ? (
                    <img
                      src={win.preview}
                      alt={win.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="truncate leading-tight">{win.title}</span>
                  )}
                </div>
              ))}
              {windows.length === 0 && (
                <div className="col-span-3 flex h-full items-center justify-center rounded border border-dashed border-white/20 text-[11px] text-ubt-grey text-opacity-70">
                  No windows
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-ubt-grey text-opacity-75">
              <span>{desktop.windows.length} window{desktop.windows.length === 1 ? '' : 's'}</span>
              <span>#{desktop.id}</span>
            </div>
          </button>
        );
      })}
      <div
        role="button"
        tabIndex={0}
        aria-label="Create a new desktop"
        data-testid="desktop-switcher-create"
        data-highlighted={newDesktopPreview ? 'true' : 'false'}
        className="flex h-32 w-48 flex-col items-center justify-center rounded-md border border-dashed border-white/25 bg-black/20 text-center text-xs transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        style={
          newDesktopPreview
            ? {
                borderColor: 'var(--color-accent)',
                boxShadow: '0 0 0 2px var(--color-accent)',
              }
            : undefined
        }
        onDragEnter={handleNewDesktopDragEnter}
        onDragOver={handleNewDesktopDragOver}
        onDragLeave={handleNewDesktopDragLeave}
        onDrop={handleNewDesktopDrop}
      >
        <span className="text-xl font-semibold text-ubt-grey">+</span>
        <span className="mt-1 text-sm font-medium text-ubt-grey">New Desktop</span>
        <span className="mt-2 max-w-[150px] text-[11px] text-ubt-grey text-opacity-80">
          Drag a window thumbnail here to create another workspace.
        </span>
      </div>
    </div>
  );
};

export default DesktopSwitcher;
