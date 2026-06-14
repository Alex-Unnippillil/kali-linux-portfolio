'use client';

import React, { useMemo, useState, useCallback } from 'react';

export interface DesktopWindowPreview {
  id: string;
  title: string;
  thumbnail?: string | null;
  isFocused?: boolean;
}

export interface DesktopSummary {
  id: string;
  name: string;
  windows: DesktopWindowPreview[];
}

export interface MoveWindowOptions {
  fromDesktopId?: string;
  focus?: boolean;
}

export type CreateDesktopResult = string | { id: string } | DesktopSummary | void;

interface DesktopSwitcherProps {
  desktops: DesktopSummary[];
  activeDesktopId: string;
  onSelectDesktop: (desktopId: string) => void;
  onCreateDesktop: (
    context?: { fromDesktopId?: string; windowId?: string },
  ) => CreateDesktopResult;
  onMoveWindowToDesktop: (
    windowId: string,
    desktopId: string,
    options?: MoveWindowOptions,
  ) => void;
  onFocusWindow?: (windowId: string) => void;
  className?: string;
  newDesktopLabel?: string;
}

const WINDOW_DATA_TYPES = [
  'application/x-window-id',
  'text/x-window-id',
  'text/window-id',
  'text/plain',
];

const DESKTOP_DATA_TYPES = [
  'application/x-desktop-id',
  'text/x-desktop-id',
  'text/desktop-id',
];

function hasMatchingType(
  dataTransfer: DataTransfer | null,
  candidates: readonly string[],
) {
  if (!dataTransfer) return false;
  const { types } = dataTransfer;
  if (!types || types.length === 0) return true;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (Array.prototype.indexOf.call(types, candidate) !== -1) {
      return true;
    }
  }
  return false;
}

function readDataTransfer(
  dataTransfer: DataTransfer | null,
  keys: readonly string[],
  options: { fallbackTypes?: boolean } = {},
): string {
  if (!dataTransfer || typeof dataTransfer.getData !== 'function') {
    return '';
  }
  for (let i = 0; i < keys.length; i += 1) {
    const raw = dataTransfer.getData(keys[i]);
    if (raw) {
      return raw;
    }
  }
  if (options.fallbackTypes && dataTransfer.types) {
    for (const type of Array.from(dataTransfer.types)) {
      const raw = dataTransfer.getData(type);
      if (raw) {
        return raw;
      }
    }
  }
  return '';
}

function decodeIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      return parsed;
    }
    if (parsed && typeof parsed.id === 'string') {
      return parsed.id;
    }
  } catch (err) {
    // Ignore JSON parse errors and fall back to raw string
  }
  return trimmed;
}

function resolveDesktopId(result: CreateDesktopResult): string {
  if (!result) return '';
  if (typeof result === 'string') {
    return result;
  }
  if (typeof (result as DesktopSummary).id === 'string') {
    return (result as DesktopSummary).id;
  }
  if (typeof (result as { id?: string }).id === 'string') {
    return (result as { id: string }).id;
  }
  return '';
}

const DesktopSwitcher: React.FC<DesktopSwitcherProps> = ({
  desktops,
  activeDesktopId,
  onSelectDesktop,
  onCreateDesktop,
  onMoveWindowToDesktop,
  onFocusWindow,
  className = '',
  newDesktopLabel = 'New Desktop',
}) => {
  const [dropActive, setDropActive] = useState(false);

  const activeIndex = useMemo(() => {
    const idx = desktops.findIndex((desktop) => desktop.id === activeDesktopId);
    return idx === -1 ? 0 : idx;
  }, [activeDesktopId, desktops]);

  const handleRootKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!desktops.length) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (activeIndex + direction + desktops.length) % desktops.length;
        const target = desktops[nextIndex];
        if (target) {
          onSelectDesktop(target.id);
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        const target = desktops[0];
        if (target) {
          onSelectDesktop(target.id);
        }
      } else if (event.key === 'End') {
        event.preventDefault();
        const target = desktops[desktops.length - 1];
        if (target) {
          onSelectDesktop(target.id);
        }
      } else if (
        (event.key === 'N' || event.key === 'n') &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey
      ) {
        event.preventDefault();
        const created = resolveDesktopId(onCreateDesktop({}));
        if (created) {
          onSelectDesktop(created);
        }
      }
    },
    [activeIndex, desktops, onCreateDesktop, onSelectDesktop],
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      if (!hasMatchingType(event.dataTransfer, WINDOW_DATA_TYPES)) return;
      event.preventDefault();
      setDropActive(true);
    },
    [],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    if (!hasMatchingType(event.dataTransfer, WINDOW_DATA_TYPES)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!dropActive) {
      setDropActive(true);
    }
  }, [dropActive]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setDropActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      if (!hasMatchingType(event.dataTransfer, WINDOW_DATA_TYPES)) return;
      event.preventDefault();
      event.stopPropagation();
      setDropActive(false);

      const rawWindowId = readDataTransfer(event.dataTransfer, WINDOW_DATA_TYPES, {
        fallbackTypes: true,
      });
      const windowId = decodeIdentifier(rawWindowId);
      if (!windowId) {
        return;
      }

      const rawFromDesktop = readDataTransfer(event.dataTransfer, DESKTOP_DATA_TYPES);
      const fromDesktopId = decodeIdentifier(rawFromDesktop);

      const created = resolveDesktopId(
        onCreateDesktop({ fromDesktopId: fromDesktopId || undefined, windowId }),
      );
      if (!created) {
        return;
      }

      onMoveWindowToDesktop(windowId, created, {
        fromDesktopId: fromDesktopId || undefined,
        focus: true,
      });
      onSelectDesktop(created);
      if (onFocusWindow) {
        onFocusWindow(windowId);
      }
    },
    [onCreateDesktop, onFocusWindow, onMoveWindowToDesktop, onSelectDesktop],
  );

  const handleCreateDesktop = useCallback(() => {
    const created = resolveDesktopId(onCreateDesktop({}));
    if (!created) return;
    onSelectDesktop(created);
  }, [onCreateDesktop, onSelectDesktop]);

  const containerClasses = `flex gap-4 items-start text-sm text-white ${className}`.trim();

  return (
    <div
      className={containerClasses}
      data-testid="desktop-switcher"
      tabIndex={0}
      role="group"
      aria-label="Virtual desktops"
      onKeyDown={handleRootKeyDown}
    >
      <div className="flex gap-3 overflow-x-auto" aria-live="polite">
        {desktops.map((desktop) => {
          const isActive = desktop.id === activeDesktopId;
          return (
            <button
              key={desktop.id}
              type="button"
              className={`min-w-[140px] rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                isActive ? 'ring-2 ring-ub-orange bg-black/50' : 'hover:bg-black/40'
              }`}
              aria-pressed={isActive}
              onClick={() => onSelectDesktop(desktop.id)}
              data-desktop-id={desktop.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate" title={desktop.name}>
                  {desktop.name}
                </span>
                <span className="text-xs text-white/60">{desktop.windows.length}</span>
              </div>
              <div className="mt-2 flex h-20 gap-1 rounded bg-white/5 p-1">
                {desktop.windows.length === 0 ? (
                  <div className="flex w-full items-center justify-center text-xs text-white/40">
                    Empty
                  </div>
                ) : (
                  desktop.windows.slice(0, 4).map((window) => (
                    <div
                      key={window.id}
                      className={`flex-1 overflow-hidden rounded border ${
                        window.isFocused ? 'border-ub-orange' : 'border-white/10'
                      } bg-black/40`}
                      title={window.title}
                    >
                      {window.thumbnail ? (
                        <img
                          src={window.thumbnail}
                          alt={`${window.title} preview`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-white/60">
                          {window.title.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`flex h-20 min-w-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-white/30 px-3 text-center text-white/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
          dropActive ? 'bg-white/10 ring-2 ring-ub-orange text-white' : 'hover:bg-white/5'
        }`}
        data-drop-active={dropActive ? 'true' : 'false'}
        aria-label={newDesktopLabel}
        onClick={handleCreateDesktop}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="text-lg font-semibold">＋</span>
        <span className="mt-1 text-xs uppercase tracking-wide">{newDesktopLabel}</span>
        <span className="mt-1 text-[10px] text-white/50">Drop window here</span>
      </button>
    </div>
  );
};

export default DesktopSwitcher;
