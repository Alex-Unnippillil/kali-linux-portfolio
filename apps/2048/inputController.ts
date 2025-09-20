import { RefObject, useCallback, useEffect, useRef } from 'react';

export type MoveDirection = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export const MOVE_THROTTLE_MS = 110;

const MOVEMENT_KEYS: MoveDirection[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

export interface InputControllerOptions {
  containerRef: RefObject<HTMLElement | null>;
  onMove: (direction: MoveDirection) => void;
  onUndo: () => void;
  onRestart: () => void;
  disabled?: boolean;
}

export const useInputController = ({
  containerRef,
  onMove,
  onUndo,
  onRestart,
  disabled = false,
}: InputControllerOptions) => {
  const lastMoveRef = useRef(0);

  const dispatchMove = useCallback(
    (direction: MoveDirection) => {
      if (disabled) return;
      const now = Date.now();
      if (now - lastMoveRef.current < MOVE_THROTTLE_MS) {
        return;
      }
      lastMoveRef.current = now;
      onMove(direction);
    },
    [disabled, onMove]
  );

  useEffect(() => {
    if (!disabled) {
      lastMoveRef.current = 0;
    }
  }, [disabled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;

      if (MOVEMENT_KEYS.includes(event.key as MoveDirection)) {
        event.preventDefault();
        dispatchMove(event.key as MoveDirection);
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        onRestart();
        return;
      }

      if (event.key === 'u' || event.key === 'U' || event.key === 'Backspace') {
        event.preventDefault();
        onUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchMove, onRestart, onUndo, disabled]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    const pointerIdRef: { id: number | null } = { id: null };
    const threshold = 30;

    const stopTracking = () => {
      tracking = false;
      pointerIdRef.id = null;
    };

    const readCoordinate = (value: unknown, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (disabled) return;
      tracking = true;
      startX = readCoordinate(event.clientX, 0);
      startY = readCoordinate(event.clientY, 0);
      pointerIdRef.id = event.pointerId;
      if (typeof node.setPointerCapture === 'function') {
        try {
          node.setPointerCapture(event.pointerId);
        } catch (error) {
          // Ignore environments that disallow pointer capture (e.g., JSDOM)
        }
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!tracking || disabled) {
        stopTracking();
        return;
      }
      if (pointerIdRef.id !== null && event.pointerId !== pointerIdRef.id) {
        return;
      }

      const endX = readCoordinate(event.clientX, startX);
      const endY = readCoordinate(event.clientY, startY);
      const dx = endX - startX;
      const dy = endY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) < threshold) {
        stopTracking();
        return;
      }

      let direction: MoveDirection;
      if (absX > absY) {
        direction = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
      } else {
        direction = dy > 0 ? 'ArrowDown' : 'ArrowUp';
      }

      dispatchMove(direction);
      stopTracking();
    };

    const cancelTracking = () => {
      stopTracking();
    };

    node.addEventListener('pointerdown', handlePointerDown);
    node.addEventListener('pointerup', handlePointerUp);
    node.addEventListener('pointercancel', cancelTracking);
    node.addEventListener('pointerleave', cancelTracking);

    return () => {
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('pointerup', handlePointerUp);
      node.removeEventListener('pointercancel', cancelTracking);
      node.removeEventListener('pointerleave', cancelTracking);
    };
  }, [containerRef, dispatchMove, disabled]);
};

export default useInputController;
