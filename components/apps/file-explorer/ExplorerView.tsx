'use client';

import React, {
  FormEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ExplorerEntryKind = 'file' | 'directory';

export interface ExplorerEntry {
  key: string;
  name: string;
  kind: ExplorerEntryKind;
  handle?: FileSystemHandle;
}

interface ExplorerViewProps {
  items: ExplorerEntry[];
  selectedKeys: ReadonlySet<string>;
  onSelectionChange: (keys: Set<string>) => void;
  onOpenItem: (item: ExplorerEntry) => void;
  onRenameItem: (item: ExplorerEntry, nextName: string) => Promise<void> | void;
  emptyLabel?: string;
}

const LONG_PRESS_MS = 400;
const DOUBLE_TAP_MS = 350;
const MOVE_THRESHOLD = 6;

type SelectionOverlay = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PointerSelectionState = {
  pointerId: number | null;
  pointerType: string | null;
  key: string | null;
  startX: number;
  startY: number;
  longPressHandled: boolean;
};

type LassoState = {
  pointerId: number;
  startX: number;
  startY: number;
  additive: boolean;
  baseSelection: Set<string>;
  boxes: Map<string, DOMRect>;
  containerRect: DOMRect;
};

const pointerStateDefaults: PointerSelectionState = {
  pointerId: null,
  pointerType: null,
  key: null,
  startX: 0,
  startY: 0,
  longPressHandled: false,
};

function rectIntersects(rect: DOMRect, box: { left: number; top: number; right: number; bottom: number }) {
  return !(rect.right < box.left || rect.left > box.right || rect.bottom < box.top || rect.top > box.bottom);
}

const ExplorerView: React.FC<ExplorerViewProps> = ({
  items,
  selectedKeys,
  onSelectionChange,
  onOpenItem,
  onRenameItem,
  emptyLabel = 'This folder is empty.',
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [renameKey, setRenameKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionOverlay | null>(null);
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pointerState = useRef<PointerSelectionState>({ ...pointerStateDefaults });
  const longPressTimer = useRef<number | null>(null);
  const lastTapRef = useRef<{ key: string | null; time: number }>({ key: null, time: 0 });
  const lassoState = useRef<LassoState | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renameKey && renameInputRef.current) {
      renameInputRef.current.focus({ preventScroll: true });
      renameInputRef.current.select();
    }
  }, [renameKey]);

  useEffect(() => {
    if (renameKey && !items.some((item) => item.key === renameKey)) {
      setRenameKey(null);
      setRenameValue('');
      setRenameError(null);
    }
  }, [items, renameKey]);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const resetPointerState = useCallback(() => {
    pointerState.current = { ...pointerStateDefaults };
    clearLongPress();
  }, [clearLongPress]);

  const beginRename = useCallback(
    (item: ExplorerEntry) => {
      setRenameKey(item.key);
      setRenameValue(item.name);
      setRenameError(null);
    },
    [],
  );

  const commitRename = useCallback(
    async (item: ExplorerEntry) => {
      if (!renameKey || renameKey !== item.key) return;
      const trimmed = renameValue.trim();
      if (!trimmed) {
        setRenameError('Name cannot be empty.');
        return;
      }
      if (trimmed === item.name) {
        setRenameKey(null);
        setRenameValue('');
        return;
      }
      try {
        setIsSubmittingRename(true);
        await onRenameItem(item, trimmed);
        setRenameKey(null);
        setRenameValue('');
        setRenameError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Rename failed.';
        setRenameError(message);
      } finally {
        setIsSubmittingRename(false);
      }
    },
    [onRenameItem, renameKey, renameValue],
  );

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const updateSelection = useCallback(
    (updater: (current: Set<string>) => Set<string>) => {
      const next = updater(new Set(selectedSet));
      onSelectionChange(next);
    },
    [selectedSet, onSelectionChange],
  );

  const handleItemPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, item: ExplorerEntry) => {
      event.stopPropagation();
      const pointerType = event.pointerType || (event.type === 'mousedown' ? 'mouse' : 'touch');
      pointerState.current = {
        pointerId: event.pointerId,
        pointerType,
        key: item.key,
        startX: event.clientX,
        startY: event.clientY,
        longPressHandled: false,
      };

      if (pointerType === 'touch') {
        clearLongPress();
        longPressTimer.current = window.setTimeout(() => {
          pointerState.current.longPressHandled = true;
          updateSelection((current) => {
            if (!current.has(item.key)) current.add(item.key);
            return current;
          });
        }, LONG_PRESS_MS);
      } else if (!event.shiftKey && !event.metaKey && !event.ctrlKey && !selectedSet.has(item.key)) {
        updateSelection(() => new Set([item.key]));
      }

      (event.currentTarget as HTMLElement).focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [clearLongPress, selectedSet, updateSelection],
  );

  const handleItemPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (pointerState.current.pointerId !== event.pointerId) return;
    const deltaX = Math.abs(event.clientX - pointerState.current.startX);
    const deltaY = Math.abs(event.clientY - pointerState.current.startY);
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      clearLongPress();
    }
  }, [clearLongPress]);

  const handleItemPointerCancel = useCallback(() => {
    resetPointerState();
  }, [resetPointerState]);

  const handleItemPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>, item: ExplorerEntry) => {
      event.stopPropagation();
      if (pointerState.current.pointerId !== event.pointerId) {
        resetPointerState();
        return;
      }

      const { pointerType, longPressHandled, startX, startY } = pointerState.current;
      const deltaX = Math.abs(event.clientX - startX);
      const deltaY = Math.abs(event.clientY - startY);
      const isTap = deltaX < MOVE_THRESHOLD && deltaY < MOVE_THRESHOLD;

      if (pointerType === 'touch') {
        if (longPressHandled) {
          resetPointerState();
          return;
        }
        clearLongPress();
        if (!isTap) {
          resetPointerState();
          return;
        }
        const now = Date.now();
        if (lastTapRef.current.key === item.key && now - lastTapRef.current.time < DOUBLE_TAP_MS) {
          beginRename(item);
          lastTapRef.current = { key: null, time: 0 };
          resetPointerState();
          return;
        }
        lastTapRef.current = { key: item.key, time: now };
        if (selectedSet.size <= 1 && selectedSet.has(item.key)) {
          onOpenItem(item);
        } else {
          updateSelection(() => new Set([item.key]));
          onOpenItem(item);
        }
      } else {
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
          updateSelection((current) => {
            if (current.has(item.key)) current.delete(item.key);
            else current.add(item.key);
            return current;
          });
        } else {
          updateSelection(() => new Set([item.key]));
          if (isTap) onOpenItem(item);
        }
      }
      resetPointerState();
    },
    [beginRename, clearLongPress, onOpenItem, resetPointerState, selectedSet, updateSelection],
  );

  const handleItemKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, item: ExplorerEntry) => {
      if (renameKey === item.key) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        updateSelection(() => new Set([item.key]));
        onOpenItem(item);
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          updateSelection((current) => {
            if (current.has(item.key)) current.delete(item.key);
            else current.add(item.key);
            return current;
          });
        } else {
          const toggle = selectedSet.size > 1 || !selectedSet.has(item.key);
          updateSelection(() => {
            const next = new Set<string>();
            if (!toggle) return next;
            next.add(item.key);
            return next;
          });
        }
      } else if (event.key === 'F2') {
        event.preventDefault();
        beginRename(item);
      }
    },
    [beginRename, onOpenItem, renameKey, selectedSet, updateSelection],
  );

  const handleContainerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== undefined && event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest('[data-explorer-item="true"]')) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      container.setPointerCapture(event.pointerId);
      const boxes = new Map<string, DOMRect>();
      itemRefs.current.forEach((element, key) => {
        boxes.set(key, element.getBoundingClientRect());
      });
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      lassoState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        additive,
        baseSelection: new Set(selectedSet),
        boxes,
        containerRect: rect,
      };
      setSelectionBox({
        left: event.clientX - rect.left,
        top: event.clientY - rect.top,
        width: 0,
        height: 0,
      });
      if (!additive) {
        onSelectionChange(new Set());
      }
      event.preventDefault();
    },
    [onSelectionChange, selectedSet],
  );

  const handleContainerPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const lasso = lassoState.current;
      if (!lasso || lasso.pointerId !== event.pointerId) return;
      const { startX, startY, containerRect } = lasso;
      const currentX = event.clientX;
      const currentY = event.clientY;
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const right = Math.max(startX, currentX);
      const bottom = Math.max(startY, currentY);
      setSelectionBox({
        left: left - containerRect.left,
        top: top - containerRect.top,
        width: right - left,
        height: bottom - top,
      });
      const viewportBox = { left, top, right, bottom };
      const next = lasso.additive ? new Set(lasso.baseSelection) : new Set<string>();
      lasso.boxes.forEach((rect, key) => {
        if (rectIntersects(rect, viewportBox)) {
          next.add(key);
        }
      });
      onSelectionChange(next);
      event.preventDefault();
    },
    [onSelectionChange],
  );

  const finishLasso = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const lasso = lassoState.current;
    if (!lasso || lasso.pointerId !== event.pointerId) return;
    lassoState.current = null;
    setSelectionBox(null);
  }, []);

  const handleRenameSubmit = useCallback(
    async (event: FormEvent, item: ExplorerEntry) => {
      event.preventDefault();
      await commitRename(item);
    },
    [commitRename],
  );

  const renderItem = useCallback(
    (item: ExplorerEntry) => {
      const isSelected = selectedSet.has(item.key);
      const isRenaming = renameKey === item.key;
      const typeLabel = item.kind === 'directory' ? 'Folder' : 'File';
      const baseClasses =
        'relative rounded-lg border px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300';
      const selectedClasses = isSelected
        ? 'border-orange-400 bg-orange-400/20'
        : 'border-white/10 bg-black/30';
      const layoutClasses =
        viewMode === 'grid'
          ? 'flex flex-col items-center justify-between text-center gap-2'
          : 'flex flex-row items-center gap-4 text-left';

      return (
        <div
          key={item.key}
          role="gridcell"
          aria-selected={isSelected}
          tabIndex={0}
          data-explorer-item="true"
          ref={(element) => {
            if (element) itemRefs.current.set(item.key, element);
            else itemRefs.current.delete(item.key);
          }}
          onPointerDown={(event) => handleItemPointerDown(event, item)}
          onPointerUp={(event) => handleItemPointerUp(event, item)}
          onPointerMove={handleItemPointerMove}
          onPointerCancel={handleItemPointerCancel}
          onKeyDown={(event) => handleItemKeyDown(event, item)}
          className={`${baseClasses} ${selectedClasses} ${layoutClasses}`}
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-md text-2xl ${
              isSelected ? 'bg-orange-500/30 text-orange-100' : 'bg-white/10 text-white/80'
            }`}
            aria-hidden="true"
          >
            {item.kind === 'directory' ? '📁' : '📄'}
          </div>
          <div className={`flex flex-1 ${viewMode === 'grid' ? 'flex-col items-center' : 'flex-row items-center gap-3'}`}>
            {isRenaming ? (
              <form onSubmit={(event) => handleRenameSubmit(event, item)} className="flex w-full flex-col items-stretch gap-1">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(event) => {
                    setRenameValue(event.target.value);
                    setRenameError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setRenameKey(null);
                      setRenameValue('');
                      setRenameError(null);
                    }
                  }}
                  onBlur={() => {
                    if (!isSubmittingRename) {
                      void commitRename(item);
                    }
                  }}
                  disabled={isSubmittingRename}
                  aria-label={`Rename ${item.name}`}
                  className="w-full rounded-md border border-orange-400 bg-black/60 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                {renameError && (
                  <span role="alert" className="text-left text-xs text-orange-200">
                    {renameError}
                  </span>
                )}
              </form>
            ) : (
              <span className="text-sm font-medium text-white" aria-label={`${item.name}, ${typeLabel}`}>
                {item.name}
              </span>
            )}
          </div>
          {!isRenaming && (
            <div className={`${viewMode === 'grid' ? 'w-full' : 'ml-auto'}`}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  beginRename(item);
                }}
                className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
              >
                Rename
              </button>
            </div>
          )}
          <span className="sr-only">{`${typeLabel}. ${isSelected ? 'Selected' : 'Not selected'}.`}</span>
        </div>
      );
    },
    [beginRename, commitRename, handleItemKeyDown, handleItemPointerCancel, handleItemPointerDown, handleItemPointerMove, handleItemPointerUp, handleRenameSubmit, isSubmittingRename, renameError, renameKey, renameValue, selectedSet, viewMode],
  );

  return (
    <section aria-label="Explorer view" className="flex h-full min-h-[16rem] flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs uppercase tracking-wide text-white/70">
        <span>{selectedSet.size ? `${selectedSet.size} selected` : 'No selection'}</span>
        <div className="flex items-center gap-2">
          <span className="sr-only" id="view-mode-label">
            Choose layout view
          </span>
          <button
            type="button"
            aria-labelledby="view-mode-label"
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            className={`rounded-md border px-2 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 ${
              viewMode === 'grid' ? 'border-orange-400 bg-orange-400/20 text-white' : 'border-white/10 bg-black/40 text-white/80'
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            aria-labelledby="view-mode-label"
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={`rounded-md border px-2 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 ${
              viewMode === 'list' ? 'border-orange-400 bg-orange-400/20 text-white' : 'border-white/10 bg-black/40 text-white/80'
            }`}
          >
            List
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        role="grid"
        aria-multiselectable="true"
        tabIndex={-1}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={finishLasso}
        onPointerCancel={finishLasso}
        className={`relative flex-1 overflow-auto p-3 ${
          viewMode === 'grid'
            ? 'grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3'
            : 'flex flex-col gap-3'
        }`}
      >
        {items.length === 0 && (
          <div role="note" className="rounded-md border border-white/10 bg-black/40 p-6 text-center text-sm text-white/70">
            {emptyLabel}
          </div>
        )}
        {items.map((item) => renderItem(item))}
        {selectionBox && (
          <div
            className="pointer-events-none absolute z-30 rounded border border-dashed border-orange-300 bg-orange-400/10"
            style={{
              left: `${selectionBox.left}px`,
              top: `${selectionBox.top}px`,
              width: `${selectionBox.width}px`,
              height: `${selectionBox.height}px`,
            }}
          />
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {selectedSet.size === 0
          ? 'No items selected'
          : `${selectedSet.size} item${selectedSet.size === 1 ? '' : 's'} selected`}
      </div>
    </section>
  );
};

export default ExplorerView;
