'use client';

import { RefObject, useEffect, useRef } from 'react';

export interface PointerDragEvent {
  x: number;
  y: number;
  dx: number;
  dy: number;
  event: PointerEvent;
}

export interface PointerDragCallbacks {
  onStart?: (event: Omit<PointerDragEvent, 'dx' | 'dy'>) => void;
  onMove?: (event: PointerDragEvent) => void;
  onEnd?: (event: Omit<PointerDragEvent, 'dx' | 'dy'>) => void;
}

function isPrimaryButton(event: PointerEvent) {
  return event.pointerType !== 'mouse' || event.button === 0;
}

export default function usePointerDrag<T extends HTMLElement>(
  ref: RefObject<T>,
  callbacks: PointerDragCallbacks,
) {
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>();
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === 'undefined') {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!isPrimaryButton(event)) return;
      pointerIdRef.current = event.pointerId;
      startRef.current = { x: event.clientX, y: event.clientY };
      try {
        node.setPointerCapture(event.pointerId);
      } catch (err) {
        // ignore environments that do not support pointer capture
      }
      callbacksRef.current.onStart?.({ x: event.clientX, y: event.clientY, event });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      if (rafRef.current !== undefined) {
        window.cancelAnimationFrame(rafRef.current);
      }
      const dx = event.clientX - startRef.current.x;
      const dy = event.clientY - startRef.current.y;
      rafRef.current = window.requestAnimationFrame(() => {
        callbacksRef.current.onMove?.({ x: event.clientX, y: event.clientY, dx, dy, event });
      });
    };

    const releasePointer = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      pointerIdRef.current = null;
      if (rafRef.current !== undefined) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      try {
        if (node.hasPointerCapture?.(event.pointerId)) {
          node.releasePointerCapture(event.pointerId);
        }
      } catch (err) {
        // ignore release errors
      }
      callbacksRef.current.onEnd?.({ x: event.clientX, y: event.clientY, event });
    };

    node.addEventListener('pointerdown', handlePointerDown);
    node.addEventListener('pointermove', handlePointerMove);
    node.addEventListener('pointerup', releasePointer);
    node.addEventListener('pointercancel', releasePointer);

    return () => {
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('pointermove', handlePointerMove);
      node.removeEventListener('pointerup', releasePointer);
      node.removeEventListener('pointercancel', releasePointer);
      if (rafRef.current !== undefined) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [ref]);
}
