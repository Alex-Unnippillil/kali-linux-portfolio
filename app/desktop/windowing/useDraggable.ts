'use client';

import { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import { snap } from './snap';

export interface DraggablePosition {
  x: number;
  y: number;
}

export interface UseDraggableOptions {
  targetRef: MutableRefObject<HTMLElement | null>;
  handleRef?: MutableRefObject<HTMLElement | null>;
  disabled?: boolean;
  initialX?: number;
  initialY?: number;
  onDragStart?: (position: DraggablePosition, event: PointerEvent) => void;
  onDrag?: (position: DraggablePosition, event: PointerEvent) => void;
  onDragEnd?: (position: DraggablePosition, event: PointerEvent) => void;
}

export interface UseDraggableResult {
  position: MutableRefObject<DraggablePosition>;
  setPosition: (next: Partial<DraggablePosition>) => DraggablePosition;
}

export const useDraggable = ({
  targetRef,
  handleRef,
  disabled = false,
  initialX = 0,
  initialY = 0,
  onDragStart,
  onDrag,
  onDragEnd,
}: UseDraggableOptions): UseDraggableResult => {
  const positionRef = useRef<DraggablePosition>({
    x: snap(initialX),
    y: snap(initialY),
  });
  const offsetRef = useRef<DraggablePosition>({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const previousUserSelectRef = useRef<string>('');

  const applyPosition = useCallback(
    (x: number, y: number): DraggablePosition => {
      const snapped: DraggablePosition = { x: snap(x), y: snap(y) };
      positionRef.current = snapped;
      const node = targetRef.current;
      if (node) {
        node.style.left = `${snapped.x}px`;
        node.style.top = `${snapped.y}px`;
      }
      return snapped;
    },
    [targetRef],
  );

  const setPosition = useCallback(
    (next: Partial<DraggablePosition>): DraggablePosition => {
      const x = next.x ?? positionRef.current.x;
      const y = next.y ?? positionRef.current.y;
      return applyPosition(x, y);
    },
    [applyPosition],
  );

  useEffect(() => {
    setPosition({ x: initialX, y: initialY });
  }, [initialX, initialY, setPosition]);

  useEffect(() => {
    const target = targetRef.current;
    const handle = handleRef?.current ?? target;
    if (!target || !handle || disabled) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      draggingRef.current = true;
      pointerIdRef.current = event.pointerId;
      offsetRef.current = {
        x: event.clientX - positionRef.current.x,
        y: event.clientY - positionRef.current.y,
      };

      if (typeof document !== 'undefined') {
        previousUserSelectRef.current = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
      }

      if (handle.setPointerCapture) {
        try {
          handle.setPointerCapture(event.pointerId);
        } catch (error) {
          // Ignore errors from unsupported pointer capture on some elements
        }
      }

      onDragStart?.(positionRef.current, event);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }

      event.preventDefault();
      const nextX = event.clientX - offsetRef.current.x;
      const nextY = event.clientY - offsetRef.current.y;
      const snapped = applyPosition(nextX, nextY);
      onDrag?.(snapped, event);
    };

    const cleanupPointerCapture = () => {
      if (pointerIdRef.current !== null && handle.hasPointerCapture?.(pointerIdRef.current)) {
        handle.releasePointerCapture(pointerIdRef.current);
      }
      pointerIdRef.current = null;
    };

    const restoreSelection = () => {
      if (typeof document !== 'undefined') {
        document.body.style.userSelect = previousUserSelectRef.current;
      }
      previousUserSelectRef.current = '';
    };

    const endDrag = (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }

      draggingRef.current = false;
      cleanupPointerCapture();
      restoreSelection();
      onDragEnd?.(positionRef.current, event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      endDrag(event);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      endDrag(event);
    };

    handle.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      handle.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      restoreSelection();
      cleanupPointerCapture();
      draggingRef.current = false;
    };
  }, [applyPosition, disabled, handleRef, onDrag, onDragEnd, onDragStart, targetRef]);

  return { position: positionRef, setPosition };
};
