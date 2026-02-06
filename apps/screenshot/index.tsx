'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

type Point = {
  x: number;
  y: number;
};

type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const KEYBOARD_STEP = 1;
const KEYBOARD_STEP_FAST = 10;

const hasValidArea = (selection: Selection | null) => {
  if (!selection) return false;
  return selection.width > 0 && selection.height > 0;
};

export default function ScreenshotRegionSelector() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<Point | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getContainerRect = useCallback(
    () => containerRef.current?.getBoundingClientRect() ?? null,
    [],
  );

  const updateSelectionFromEvent = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = getContainerRect();
      const origin = originRef.current;
      if (!rect || !origin) return;

      const currentX = clamp(event.clientX - rect.left, 0, rect.width);
      const currentY = clamp(event.clientY - rect.top, 0, rect.height);

      const left = Math.min(origin.x, currentX);
      const top = Math.min(origin.y, currentY);
      const width = Math.abs(currentX - origin.x);
      const height = Math.abs(currentY - origin.y);

      setSelection({ x: left, y: top, width, height });
    },
    [getContainerRect],
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const rect = getContainerRect();
    if (!rect) return;

    event.preventDefault();
    const startX = clamp(event.clientX - rect.left, 0, rect.width);
    const startY = clamp(event.clientY - rect.top, 0, rect.height);
    originRef.current = { x: startX, y: startY };

    setSelection({ x: startX, y: startY, width: 0, height: 0 });
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    containerRef.current?.focus();
  }, [getContainerRect]);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.preventDefault();
      updateSelectionFromEvent(event);
    },
    [isDragging, updateSelectionFromEvent],
  );

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    updateSelectionFromEvent(event);
    setIsDragging(false);
    originRef.current = null;
  }, [isDragging, updateSelectionFromEvent]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!selection) return;
      const rect = getContainerRect();
      if (!rect) return;

      const step = event.shiftKey ? KEYBOARD_STEP_FAST : KEYBOARD_STEP;

      let handled = false;
      setSelection((prev) => {
        if (!prev) return prev;
        let { x, y, width, height } = prev;
        const maxX = Math.max(0, rect.width - width);
        const maxY = Math.max(0, rect.height - height);

        switch (event.key) {
          case 'ArrowLeft':
            x = clamp(x - step, 0, maxX);
            handled = true;
            break;
          case 'ArrowRight':
            x = clamp(x + step, 0, maxX);
            handled = true;
            break;
          case 'ArrowUp':
            y = clamp(y - step, 0, maxY);
            handled = true;
            break;
          case 'ArrowDown':
            y = clamp(y + step, 0, maxY);
            handled = true;
            break;
          case 'Escape':
            handled = true;
            return null;
          default:
            break;
        }

        if (!handled) {
          return prev;
        }

        return { x, y, width, height };
      });

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [getContainerRect, selection],
  );

  const readout = useMemo(() => {
    if (!selection) return { width: 0, height: 0 };
    return {
      width: Math.round(selection.width),
      height: Math.round(selection.height),
    };
  }, [selection]);

  const labelPositionClass = selection && selection.y < 24 ? 'top-full mt-1' : '-top-6';

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 text-white">
      <div>
        <h1 className="text-2xl font-semibold">Screenshot Region Selector</h1>
        <p className="mt-1 text-sm text-ubt-grey">
          Click and drag to draw a region. Use arrow keys to fine tune the selection; hold Shift for larger
          adjustments. Press Escape to clear.
        </p>
      </div>
      <div
        ref={containerRef}
        role="application"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerLeave={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={handleKeyDown}
        className="relative flex-1 rounded-lg border border-white/20 bg-ub-cool-grey/60 outline-none"
        style={{ cursor: 'crosshair', touchAction: 'none' }}
        aria-label="Screenshot selection canvas"
      >
        {hasValidArea(selection) && (
          <div
            aria-label="Selected region"
            className="pointer-events-none absolute border-2 border-sky-400 bg-sky-400/20"
            style={{
              left: `${selection!.x}px`,
              top: `${selection!.y}px`,
              width: `${selection!.width}px`,
              height: `${selection!.height}px`,
            }}
          >
            <div
              className={`absolute left-0 whitespace-nowrap rounded bg-sky-500 px-2 py-0.5 text-xs font-medium text-white shadow ${labelPositionClass}`}
            >
              {readout.width} × {readout.height}
            </div>
          </div>
        )}
        {!selection && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/50">
            Drag to create a capture region
          </div>
        )}
      </div>
      <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm">
        <div className="font-semibold uppercase tracking-wide text-white/70">Region details</div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <dt className="text-white/50">X</dt>
            <dd className="font-medium">{selection ? Math.round(selection.x) : '—'}</dd>
          </div>
          <div>
            <dt className="text-white/50">Y</dt>
            <dd className="font-medium">{selection ? Math.round(selection.y) : '—'}</dd>
          </div>
          <div>
            <dt className="text-white/50">Width</dt>
            <dd className="font-medium">{selection ? readout.width : '—'}</dd>
          </div>
          <div>
            <dt className="text-white/50">Height</dt>
            <dd className="font-medium">{selection ? readout.height : '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
