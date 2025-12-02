'use client';

import React, {
  CSSProperties,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import usePointerDrag from '../../hooks/usePointerDrag';
import { useWindowManager } from '../../state/windowManager';
import type { WindowBounds } from '../../state/windowManager';
import { computeSnapZone, isFullViewportRect, type SnapResult } from '../../utils/windowSnap';

interface WindowProps {
  id: string;
  desktopRef: RefObject<HTMLDivElement>;
}

const RESIZE_DIRECTIONS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;

type ResizeDirection = (typeof RESIZE_DIRECTIONS)[number];

function cloneBounds(bounds: WindowBounds): WindowBounds {
  return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function Window({ id, desktopRef }: WindowProps) {
  const { windows, dispatch } = useWindowManager();
  const data = windows[id];
  const windowRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef({ dx: 0, dy: 0 });
  const boundsRef = useRef<WindowBounds>(data.bounds);
  const dataRef = useRef(data);
  const [preview, setPreview] = useState<SnapResult | null>(null);
  const previewRef = useRef<SnapResult | null>(null);
  const [interacting, setInteracting] = useState(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    boundsRef.current = data.bounds;
  }, [data.bounds]);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  const focusWindow = useCallback(() => {
    dispatch({ type: 'FOCUS', id });
  }, [dispatch, id]);

  const moveWindowBy = useCallback(
    (dx: number, dy: number) => {
      const desktopNode = desktopRef.current;
      if (!desktopNode) return;
      const { width: desktopWidth, height: desktopHeight } = desktopNode.getBoundingClientRect();
      const current = boundsRef.current;
      const maxX = Math.max(desktopWidth - current.width, 0);
      const maxY = Math.max(desktopHeight - current.height, 0);
      const nextBounds: WindowBounds = {
        ...current,
        x: clamp(current.x + dx, 0, maxX),
        y: clamp(current.y + dy, 0, maxY),
      };
      boundsRef.current = nextBounds;
      dispatch({ type: 'SET_BOUNDS', id, bounds: nextBounds });
    },
    [desktopRef, dispatch, id],
  );

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!event.altKey) return;
      const step = event.shiftKey ? 40 : 10;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          moveWindowBy(-step, 0);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveWindowBy(step, 0);
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveWindowBy(0, -step);
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveWindowBy(0, step);
          break;
        default:
          break;
      }
    },
    [moveWindowBy],
  );

  const toggleMaximize = useCallback(() => {
    const desktopNode = desktopRef.current;
    if (!desktopNode) return;
    const { width, height } = desktopNode.getBoundingClientRect();
    const current = dataRef.current;
    if (current.state === 'maximized') {
      const target = current.prevBounds ? cloneBounds(current.prevBounds) : cloneBounds(current.bounds);
      boundsRef.current = target;
      dispatch({
        type: 'UPDATE',
        id,
        update: {
          state: 'normal',
          bounds: target,
          prevBounds: null,
          snap: null,
        },
      });
      return;
    }

    const previousBounds = cloneBounds(current.bounds);
    const nextBounds: WindowBounds = { x: 0, y: 0, width, height };
    boundsRef.current = nextBounds;
    dispatch({
      type: 'UPDATE',
      id,
      update: {
        state: 'maximized',
        prevBounds: previousBounds,
        bounds: nextBounds,
        snap: null,
      },
    });
  }, [desktopRef, dispatch, id]);

  usePointerDrag(titleRef, {
    onStart: ({ x, y, event }) => {
      if (!dataRef.current.draggable) return;
      const desktopNode = desktopRef.current;
      if (!desktopNode) return;
      event.preventDefault();
      setInteracting(true);
      focusWindow();
      setPreview(null);
      dispatch({ type: 'UPDATE', id, update: { snap: null } });
      const desktopRect = desktopNode.getBoundingClientRect();
      const pointerX = x - desktopRect.left;
      const pointerY = y - desktopRect.top;
      let baseBounds = boundsRef.current;
      const current = dataRef.current;
      if (current.state === 'maximized' && current.prevBounds) {
        const restored = cloneBounds(current.prevBounds);
        baseBounds = restored;
        boundsRef.current = restored;
        dispatch({
          type: 'UPDATE',
          id,
          update: {
            state: 'normal',
            bounds: restored,
            prevBounds: null,
            snap: null,
          },
        });
      }
      anchorRef.current = {
        dx: clamp(pointerX - baseBounds.x, 0, baseBounds.width),
        dy: clamp(pointerY - baseBounds.y, 0, baseBounds.height),
      };
    },
    onMove: ({ x, y }) => {
      const desktopNode = desktopRef.current;
      if (!desktopNode) return;
      const desktopRect = desktopNode.getBoundingClientRect();
      const pointer = { x: x - desktopRect.left, y: y - desktopRect.top };
      const zone = computeSnapZone(pointer, desktopRect.width, desktopRect.height, 28);
      setPreview(zone);
      const current = boundsRef.current;
      const anchor = anchorRef.current;
      const maxX = Math.max(desktopRect.width - current.width, 0);
      const maxY = Math.max(desktopRect.height - current.height, 0);
      const nextBounds: WindowBounds = {
        ...current,
        x: clamp(pointer.x - anchor.dx, 0, maxX),
        y: clamp(pointer.y - anchor.dy, 0, maxY),
      };
      boundsRef.current = nextBounds;
      dispatch({ type: 'SET_BOUNDS', id, bounds: nextBounds });
    },
    onEnd: () => {
      setInteracting(false);
      const desktopNode = desktopRef.current;
      if (!desktopNode) {
        setPreview(null);
        return;
      }
      const zone = previewRef.current;
      const desktopRect = desktopNode.getBoundingClientRect();
      if (zone) {
        const nextBounds = { ...zone.rect };
        const current = dataRef.current;
        const previousBounds = current.state === 'normal'
          ? cloneBounds(current.bounds)
          : current.prevBounds
          ? cloneBounds(current.prevBounds)
          : cloneBounds(current.bounds);
        const maximize = isFullViewportRect(zone.rect, desktopRect.width, desktopRect.height);
        boundsRef.current = nextBounds;
        dispatch({
          type: 'UPDATE',
          id,
          update: {
            state: maximize ? 'maximized' : 'snapped',
            prevBounds: previousBounds,
            bounds: nextBounds,
            snap: maximize ? null : { type: zone.type, rect: nextBounds },
          },
        });
      }
      setPreview(null);
    },
  });

  const handleResizePointerDown = useCallback(
    (direction: ResizeDirection) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const desktopNode = desktopRef.current;
      if (!desktopNode) return;
      event.preventDefault();
      event.stopPropagation();
      focusWindow();
      setInteracting(true);
      setPreview(null);

      let startingBounds = cloneBounds(boundsRef.current);
      const current = dataRef.current;
      if (current.state === 'maximized' && current.prevBounds) {
        const restored = cloneBounds(current.prevBounds);
        startingBounds = restored;
        boundsRef.current = restored;
        dispatch({
          type: 'UPDATE',
          id,
          update: {
            state: 'normal',
            bounds: restored,
            prevBounds: null,
            snap: null,
          },
        });
      }

      const handleElement = event.currentTarget;
      const pointerId = event.pointerId;
      handleElement.setPointerCapture?.(pointerId);
      const desktopRect = desktopNode.getBoundingClientRect();
      const minWidth = current.minWidth;
      const minHeight = current.minHeight;
      let frame: number | null = null;

      const updateBounds = (moveEvent: PointerEvent) => {
        const pointerX = clamp(moveEvent.clientX - desktopRect.left, 0, desktopRect.width);
        const pointerY = clamp(moveEvent.clientY - desktopRect.top, 0, desktopRect.height);
        let { x, y, width, height } = startingBounds;

        if (direction.includes('e')) {
          width = Math.max(minWidth, pointerX - startingBounds.x);
        }
        if (direction.includes('s')) {
          height = Math.max(minHeight, pointerY - startingBounds.y);
        }
        if (direction.includes('w')) {
          const maxX = startingBounds.x + startingBounds.width - minWidth;
          const nextX = clamp(pointerX, 0, maxX);
          width = Math.max(minWidth, startingBounds.width + (startingBounds.x - nextX));
          x = nextX;
        }
        if (direction.includes('n')) {
          const maxY = startingBounds.y + startingBounds.height - minHeight;
          const nextY = clamp(pointerY, 0, maxY);
          height = Math.max(minHeight, startingBounds.height + (startingBounds.y - nextY));
          y = nextY;
        }

        const maxWidth = desktopRect.width - x;
        const maxHeight = desktopRect.height - y;
        const boundedWidth = clamp(width, minWidth, maxWidth);
        const boundedHeight = clamp(height, minHeight, maxHeight);
        const nextBounds: WindowBounds = { x, y, width: boundedWidth, height: boundedHeight };
        boundsRef.current = nextBounds;
        dispatch({ type: 'SET_BOUNDS', id, bounds: nextBounds });
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
        }
        frame = window.requestAnimationFrame(() => updateBounds(moveEvent));
      };

      const cleanup = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
          frame = null;
        }
        handleElement.releasePointerCapture?.(pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', cleanup);
        window.removeEventListener('pointercancel', cleanup);
        setInteracting(false);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', cleanup);
      window.addEventListener('pointercancel', cleanup);
    },
    [dataRef, desktopRef, dispatch, focusWindow, id],
  );

  const handleMinimize = useCallback(() => {
    dispatch({ type: 'UPDATE', id, update: { state: 'minimized', active: false } });
  }, [dispatch, id]);

  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE', id });
  }, [dispatch, id]);

  const isMinimized = data.state === 'minimized';
  const classes = clsx('os-window', data.active && 'os-window--active');
  const style = useMemo<CSSProperties>(() => {
    const base: CSSProperties = {
      transform: `translate3d(${data.bounds.x}px, ${data.bounds.y}px, 0)`,
      width: data.bounds.width,
      height: data.bounds.height,
      zIndex: data.z,
    };
    if (interacting) {
      base.willChange = 'transform, width, height';
    }
    return base;
  }, [data.bounds.height, data.bounds.width, data.bounds.x, data.bounds.y, data.z, interacting]);

  if (isMinimized) {
    return null;
  }

  return (
    <>
      {preview && (
        <div
          className="os-snap-preview"
          style={{
            left: preview.rect.x,
            top: preview.rect.y,
            width: preview.rect.width,
            height: preview.rect.height,
          }}
        />
      )}
      <section
        ref={windowRef}
        className={classes}
        style={style}
        role="dialog"
        aria-labelledby={`${id}-title`}
        aria-modal="false"
        onMouseDown={focusWindow}
      >
        <header
          ref={titleRef}
          id={`${id}-title`}
          className="os-window__titlebar"
          onDoubleClick={toggleMaximize}
          onKeyDown={handleTitleKeyDown}
          tabIndex={0}
          aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown"
        >
          <span className="os-window__title">{data.title}</span>
          <div className="os-window__controls" role="group" aria-label="Window controls">
            <button type="button" onClick={handleMinimize} aria-label="Minimize window">
              —
            </button>
            <button
              type="button"
              onClick={toggleMaximize}
              aria-label={data.state === 'maximized' ? 'Restore window' : 'Maximize window'}
            >
              ▢
            </button>
            <button type="button" onClick={handleClose} aria-label="Close window">
              ×
            </button>
          </div>
        </header>
        <div className="os-window__content">
          <div className="os-window__placeholder">{data.title} content goes here.</div>
        </div>
        {RESIZE_DIRECTIONS.map((direction) => {
          const orientation =
            direction === 'e' || direction === 'w'
              ? 'vertical'
              : direction === 'n' || direction === 's'
              ? 'horizontal'
              : undefined;
          return (
            <div
              key={direction}
              className={clsx('os-resize-handle', `os-resize-handle--${direction}`)}
              onPointerDown={handleResizePointerDown(direction)}
              role="separator"
              aria-orientation={orientation}
            />
          );
        })}
      </section>
    </>
  );
}
