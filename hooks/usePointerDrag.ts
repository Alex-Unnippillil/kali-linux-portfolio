import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';

export interface PointerDragCoordinates {
  clientX: number;
  clientY: number;
}

export interface UsePointerDragOptions<T extends Element = Element> {
  disabled?: boolean;
  pointerButton?: number;
  onPointerDown?: (event: React.PointerEvent<T>) => void;
  onPointerUp?: (event: React.PointerEvent<T>) => void;
  onPointerMove?: (event: React.PointerEvent<T>) => void;
  onPointerCancel?: (event: React.PointerEvent<T>) => void;
  onPointerCaptureStart?: (event: PointerEvent) => void;
  onPointerCaptureEnd?: (event: PointerEvent) => void;
  onStart?: (event: PointerEvent, coordinates: PointerDragCoordinates) => void;
  onMove?: (event: PointerEvent, coordinates: PointerDragCoordinates) => void;
  onEnd?: (event: PointerEvent, coordinates: PointerDragCoordinates) => void;
  onCancel?: (event: PointerEvent, coordinates: PointerDragCoordinates) => void;
}

export interface PointerDragHandlers<T extends Element = Element> {
  onPointerDown: React.PointerEventHandler<T>;
  onPointerMove: React.PointerEventHandler<T>;
  onPointerUp: React.PointerEventHandler<T>;
  onPointerCancel: React.PointerEventHandler<T>;
}

interface DragSessionState {
  active: boolean;
  pointerId: number | null;
  target: Element | null;
}

export default function usePointerDrag<T extends Element = Element>(
  options: UsePointerDragOptions<T>,
): PointerDragHandlers<T> {
  const stateRef = useRef<DragSessionState>({ active: false, pointerId: null, target: null });
  const frameRef = useRef<number | null>(null);
  const latestEventRef = useRef<PointerEvent | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const flush = useCallback(() => {
    const pending = latestEventRef.current;
    frameRef.current = null;
    latestEventRef.current = null;
    if (!pending) return;
    const { onMove } = optionsRef.current;
    if (typeof onMove === 'function') {
      onMove(pending, { clientX: pending.clientX, clientY: pending.clientY });
    }
  }, []);

  const schedule = useCallback((event: PointerEvent) => {
    latestEventRef.current = event;
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    latestEventRef.current = null;
  }, []);

  const handlePointerDown = useCallback<React.PointerEventHandler<T>>((event) => {
    const opts = optionsRef.current;
    if (typeof opts.onPointerDown === 'function') {
      opts.onPointerDown(event);
    }

    if (opts.disabled) {
      return;
    }

    const { pointerButton = 0 } = opts;
    if (typeof pointerButton === 'number' && event.button !== pointerButton) {
      return;
    }

    const nativeEvent = event.nativeEvent;
    const target = event.currentTarget as Element | null;
    if (!target || typeof target.setPointerCapture !== 'function') {
      return;
    }

    try {
      target.setPointerCapture(nativeEvent.pointerId);
    } catch (error) {
      return;
    }

    stateRef.current = { active: true, pointerId: nativeEvent.pointerId, target };
    if (typeof opts.onPointerCaptureStart === 'function') {
      opts.onPointerCaptureStart(nativeEvent);
    }

    if (typeof opts.onStart === 'function') {
      opts.onStart(nativeEvent, { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
    }
  }, []);

  const handlePointerMove = useCallback<React.PointerEventHandler<T>>((event) => {
    const opts = optionsRef.current;
    if (typeof opts.onPointerMove === 'function') {
      opts.onPointerMove(event);
    }
    const state = stateRef.current;
    if (!state.active || event.pointerId !== state.pointerId) {
      return;
    }
    event.preventDefault();
    const nativeEvent = event.nativeEvent;
    schedule(nativeEvent);
  }, [schedule]);

  const endSession = useCallback((nativeEvent: PointerEvent) => {
    const opts = optionsRef.current;
    const state = stateRef.current;
    if (!state.active) {
      return;
    }

    if (state.target && typeof state.target.releasePointerCapture === 'function') {
      try {
        state.target.releasePointerCapture(nativeEvent.pointerId);
      } catch (error) {
        // ignore release errors
      }
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const pending = latestEventRef.current;
    latestEventRef.current = null;
    if (pending) {
      if (typeof opts.onMove === 'function') {
        opts.onMove(pending, { clientX: pending.clientX, clientY: pending.clientY });
      }
    }

    stateRef.current = { active: false, pointerId: null, target: null };

    if (typeof opts.onPointerCaptureEnd === 'function') {
      opts.onPointerCaptureEnd(nativeEvent);
    }
  }, []);

  const handlePointerUp = useCallback<React.PointerEventHandler<T>>((event) => {
    const opts = optionsRef.current;
    if (typeof opts.onPointerUp === 'function') {
      opts.onPointerUp(event);
    }

    const state = stateRef.current;
    if (!state.active || event.pointerId !== state.pointerId) {
      return;
    }

    const nativeEvent = event.nativeEvent;
    if (typeof opts.onEnd === 'function') {
      opts.onEnd(nativeEvent, { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
    }
    endSession(nativeEvent);
  }, [endSession]);

  const handlePointerCancel = useCallback<React.PointerEventHandler<T>>((event) => {
    const opts = optionsRef.current;
    if (typeof opts.onPointerCancel === 'function') {
      opts.onPointerCancel(event);
    }

    const state = stateRef.current;
    if (!state.active || event.pointerId !== state.pointerId) {
      return;
    }

    const nativeEvent = event.nativeEvent;
    if (typeof opts.onCancel === 'function') {
      opts.onCancel(nativeEvent, { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
    }
    endSession(nativeEvent);
  }, [endSession]);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };
}
