"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toCanvas } from 'html-to-image';

const PREVIEW_MAX_WIDTH = 320;
const PREVIEW_MAX_HEIGHT = 200;

const usePrefersReducedMotion = () => {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefers(query.matches);
    update();

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }

    if (typeof query.addListener === 'function') {
      query.addListener(update);
      return () => query.removeListener(update);
    }

    return undefined;
  }, []);

  return prefers;
};

const WindowPreviewCard = React.memo(
  React.forwardRef(function WindowPreviewCard(
    {
      windowId,
      elementId,
      title,
      icon,
      minimized,
      isSelected,
      isFocused,
      thumbnail,
      reducedMotion,
      onActivate,
      onHighlight,
    },
    ref
  ) {
    return (
      <button
        id={elementId}
        ref={ref}
        type="button"
        role="option"
        aria-selected={isSelected}
        tabIndex={isSelected ? 0 : -1}
        onClick={() => onActivate(windowId)}
        onFocus={() => onHighlight(windowId)}
        onMouseEnter={() => onHighlight(windowId)}
        className={`flex flex-col rounded-lg border border-white/10 bg-black/60 p-3 text-left shadow transition ${
          reducedMotion ? '' : 'focus-visible:-translate-y-1 focus-visible:shadow-lg'
        } ${isSelected ? 'border-ub-orange bg-white/10' : 'hover:border-white/20'} focus-visible:outline-none`}
      >
        <div className="relative aspect-video w-full overflow-hidden rounded bg-black/70">
          {thumbnail ? (
            <img
              src={thumbnail.src}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
              Preview not available
            </div>
          )}
          {minimized ? (
            <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Minimized
            </span>
          ) : null}
          {isFocused ? (
            <span className="absolute top-2 right-2 rounded bg-ub-orange px-2 py-0.5 text-[10px] font-semibold text-black">
              Current
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {icon ? (
            <img
              src={icon}
              alt=""
              className="h-6 w-6 flex-shrink-0 rounded"
              draggable={false}
            />
          ) : (
            <div className="h-6 w-6 flex-shrink-0 rounded bg-white/20" aria-hidden="true" />
          )}
          <span className="truncate text-sm font-medium text-white/90" title={title}>
            {title}
          </span>
        </div>
      </button>
    );
  }),
  (prev, next) =>
    prev.windowId === next.windowId &&
    prev.elementId === next.elementId &&
    prev.title === next.title &&
    prev.icon === next.icon &&
    prev.minimized === next.minimized &&
    prev.isSelected === next.isSelected &&
    prev.isFocused === next.isFocused &&
    prev.reducedMotion === next.reducedMotion &&
    prev.thumbnail?.src === next.thumbnail?.src
);

export default function WindowSwitcher({
  windows = [],
  minimizedWindows = {},
  focusedId = null,
  query = '',
  selectedId = null,
  onQueryChange,
  onHighlight,
  onSelect,
  onClose,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const cardRefs = useRef(new Map());
  const thumbnailsRef = useRef(new Map());
  const rafRef = useRef(null);
  const [, forceRender] = useState(0);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) {
      return windows;
    }
    return windows.filter((window) =>
      [window.title, window.id]
        .filter(Boolean)
        .some((token) => token.toLowerCase().includes(lower))
    );
  }, [windows, query]);

  const [columns, setColumns] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return Math.max(1, Math.floor(window.innerWidth / PREVIEW_MAX_WIDTH));
  });

  const scheduleFrame = useCallback((callback) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const id = window.requestAnimationFrame(callback);
      return { type: 'raf', id };
    }
    const id = setTimeout(callback, 16);
    return { type: 'timeout', id };
  }, []);

  const cancelFrameHandle = useCallback((handle) => {
    if (!handle) return;
    if (handle.type === 'raf') {
      if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(handle.id);
      }
    } else if (handle.type === 'timeout') {
      clearTimeout(handle.id);
    }
  }, []);

  const cleanupThumbnails = useCallback(() => {
    thumbnailsRef.current.forEach((value) => {
      if (value?.revoke && value.src) {
        URL.revokeObjectURL(value.src);
      }
    });
    thumbnailsRef.current.clear();
  }, []);

  useEffect(() => () => cleanupThumbnails(), [cleanupThumbnails]);

  useEffect(() => {
    if (!containerRef.current) return;

    const computeColumns = () => {
      const width = containerRef.current?.getBoundingClientRect().width || window.innerWidth;
      setColumns(Math.max(1, Math.floor(width / PREVIEW_MAX_WIDTH)));
    };

    computeColumns();
    window.addEventListener('resize', computeColumns);
    return () => window.removeEventListener('resize', computeColumns);
  }, []);

  const focusCard = useCallback((id) => {
    const node = cardRefs.current.get(id);
    if (node && document.activeElement !== node) {
      node.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId != null && typeof onHighlight === 'function') {
        onHighlight(null);
      }
      return;
    }

    const hasSelection = filtered.some((win) => win.id === selectedId);
    if (!hasSelection && typeof onHighlight === 'function') {
      onHighlight(filtered[0].id);
    }
  }, [filtered, selectedId, onHighlight]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const createThumbnail = useCallback(async (id) => {
    if (typeof document === 'undefined') return null;
    const node = document.getElementById(id);
    if (!node) return null;

    try {
      const baseCanvas = await toCanvas(node, {
        cacheBust: false,
        pixelRatio: 0.5,
        filter: (domNode) => {
          if (!(domNode instanceof HTMLElement)) return true;
          return !domNode.dataset?.windowSwitcher;
        },
      });

      const baseWidth = baseCanvas.width || PREVIEW_MAX_WIDTH;
      const baseHeight = baseCanvas.height || PREVIEW_MAX_HEIGHT;
      const ratio = Math.min(
        PREVIEW_MAX_WIDTH / baseWidth,
        PREVIEW_MAX_HEIGHT / baseHeight,
        1
      );
      const width = Math.max(1, Math.round(baseWidth * ratio));
      const height = Math.max(1, Math.round(baseHeight * ratio));

      let target;
      if (typeof OffscreenCanvas !== 'undefined') {
        target = new OffscreenCanvas(width, height);
      } else {
        target = document.createElement('canvas');
        target.width = width;
        target.height = height;
      }

      const ctx = target.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(baseCanvas, 0, 0, width, height);

      if (target instanceof OffscreenCanvas) {
        const blob = await target.convertToBlob();
        if (!blob) return null;
        return { src: URL.createObjectURL(blob), revoke: true };
      }

      return { src: target.toDataURL('image/png'), revoke: false };
    } catch (error) {
      console.warn('Failed to render window preview', error);
      return null;
    }
  }, []);

  const scheduleThumbnailWork = useCallback(
    (queue) => {
      if (!queue.length) return;

      const step = () => {
      if (!queue.length) return;
      const next = queue.shift();
      if (!next) return;

      createThumbnail(next.id).then((result) => {
        if (!result) return;
        const previous = thumbnailsRef.current.get(next.id);
        if (previous?.revoke && previous.src) {
          URL.revokeObjectURL(previous.src);
        }
        thumbnailsRef.current.set(next.id, result);
        forceRender((value) => value + 1);
      });

      if (queue.length) {
        rafRef.current = scheduleFrame(step);
      }
    };

      rafRef.current = scheduleFrame(step);
    },
    [createThumbnail, forceRender, scheduleFrame]
  );

  useEffect(() => {
    const cancelFrame = () => {
      if (!rafRef.current) return;
      cancelFrameHandle(rafRef.current);
      rafRef.current = null;
    };

    cancelFrame();

    const queue = filtered.filter((win) => !thumbnailsRef.current.has(win.id));
    if (queue.length) {
      scheduleThumbnailWork(queue.slice());
    }

    const validIds = new Set(filtered.map((win) => win.id));
    thumbnailsRef.current.forEach((value, key) => {
      if (!validIds.has(key)) {
        if (value?.revoke && value.src) {
          URL.revokeObjectURL(value.src);
        }
        thumbnailsRef.current.delete(key);
      }
    });

    return cancelFrame;
  }, [cancelFrameHandle, filtered, scheduleThumbnailWork]);

  const handleHighlight = useCallback(
    (id, focus = false) => {
      if (!id || typeof onHighlight !== 'function') return;
      if (id === selectedId) {
        if (focus) focusCard(id);
        return;
      }
      onHighlight(id);
      if (focus) focusCard(id);
    },
    [onHighlight, selectedId, focusCard]
  );

  const moveSelection = useCallback(
    (delta, { wrap }) => {
      if (!filtered.length) return;
      const index = filtered.findIndex((win) => win.id === selectedId);
      const resolvedIndex = index === -1 ? 0 : index;
      let next = resolvedIndex + delta;

      if (wrap) {
        next = (next + filtered.length) % filtered.length;
      } else {
        if (next < 0) next = 0;
        if (next >= filtered.length) next = filtered.length - 1;
      }

      const nextId = filtered[next]?.id;
      if (!nextId) return;
      handleHighlight(nextId, true);
    },
    [filtered, selectedId, handleHighlight]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!overlayRef.current?.contains(event.target)) return;

      const isTextInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target?.isContentEditable;

      switch (event.key) {
        case 'ArrowRight':
          if (isTextInput) return;
          event.preventDefault();
          moveSelection(1, { wrap: true });
          break;
        case 'ArrowLeft':
          if (isTextInput) return;
          event.preventDefault();
          moveSelection(-1, { wrap: true });
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveSelection(columns, { wrap: false });
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveSelection(-columns, { wrap: false });
          break;
        case 'Home':
          event.preventDefault();
          if (filtered.length) handleHighlight(filtered[0].id, true);
          break;
        case 'End':
          event.preventDefault();
          if (filtered.length) handleHighlight(filtered[filtered.length - 1].id, true);
          break;
        case 'Enter':
          if (typeof onSelect === 'function' && selectedId) {
            event.preventDefault();
            onSelect(selectedId);
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (typeof onClose === 'function') onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [columns, filtered, handleHighlight, moveSelection, onClose, onSelect, selectedId]);

  useEffect(() => {
    const handleAltRelease = (event) => {
      if (event.key !== 'Alt') return;
      if (typeof onSelect === 'function' && selectedId) {
        onSelect(selectedId);
      } else if (typeof onClose === 'function') {
        onClose();
      }
    };

    window.addEventListener('keyup', handleAltRelease);
    return () => window.removeEventListener('keyup', handleAltRelease);
  }, [onClose, onSelect, selectedId]);

  const handleSearchChange = useCallback(
    (event) => {
      const value = event.target.value;
      if (typeof onQueryChange === 'function') {
        onQueryChange(value);
      }
    },
    [onQueryChange]
  );

  const registerCard = useCallback((id, node) => {
    if (!id) return;
    if (node) {
      cardRefs.current.set(id, node);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  const activeSelection = useMemo(() => {
    if (!selectedId) return null;
    return filtered.find((win) => win.id === selectedId) || null;
  }, [filtered, selectedId]);

  return (
    <div
      ref={overlayRef}
      data-window-switcher="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="window-switcher-heading"
      className="fixed inset-0 z-50 flex flex-col items-center justify-start gap-6 bg-black/80 px-4 py-10 text-white backdrop-blur"
    >
      <div className="w-full max-w-4xl">
        <h2 id="window-switcher-heading" className="sr-only">
          Window switcher
        </h2>
        <label className="block text-sm font-medium text-white/70" htmlFor="window-switcher-search">
          Search windows
        </label>
        <input
          id="window-switcher-search"
          ref={inputRef}
          value={query}
          onChange={handleSearchChange}
          className="mt-2 w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-ub-orange focus:outline-none focus:ring-2 focus:ring-ub-orange"
          placeholder="Type to filter open windows"
          autoComplete="off"
        />
        <div className="mt-2 text-xs text-white/60">
          {filtered.length ? `${filtered.length} window${filtered.length > 1 ? 's' : ''} visible` : 'No windows match the current search'}
        </div>
      </div>

      <div
        ref={containerRef}
        role="listbox"
        aria-activedescendant={activeSelection ? `window-switcher-${activeSelection.id}` : undefined}
        className="grid w-full max-w-6xl grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
      >
        {filtered.map((window) => {
          const thumbnail = thumbnailsRef.current.get(window.id) || null;
          const isSelected = window.id === selectedId;
          return (
            <WindowPreviewCard
              key={window.id}
              windowId={window.id}
              elementId={`window-switcher-${window.id}`}
              ref={(node) => registerCard(window.id, node)}
              title={window.title || window.id}
              icon={window.icon}
              minimized={Boolean(minimizedWindows[window.id])}
              isSelected={isSelected}
              isFocused={window.id === focusedId}
              thumbnail={thumbnail}
              reducedMotion={reducedMotion}
              onActivate={(id) => onSelect && onSelect(id)}
              onHighlight={(id) => handleHighlight(id, false)}
            />
          );
        })}
      </div>

      {activeSelection ? (
        <div className="text-xs text-white/60">
          Use arrow keys to navigate, Enter to open, Escape to cancel.
        </div>
      ) : null}

      <button
        type="button"
        className="rounded bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
        onClick={() => onClose && onClose()}
      >
        Close
      </button>
    </div>
  );
}

