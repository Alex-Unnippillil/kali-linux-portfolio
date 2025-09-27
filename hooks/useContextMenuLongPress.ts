import { useEffect } from 'react';

interface Options {
  /** Duration in ms before a long press triggers */
  delay?: number;
  /** CSS class applied while a press is held */
  activeClassName?: string;
  /** Maximum pointer movement (px) before cancelling */
  movementThreshold?: number;
}

const DEFAULT_DELAY = 650;
const DEFAULT_CLASS = 'context-menu-pressing';
const DEFAULT_THRESHOLD = 10;

const useContextMenuLongPress = (
  {
    delay = DEFAULT_DELAY,
    activeClassName = DEFAULT_CLASS,
    movementThreshold = DEFAULT_THRESHOLD,
  }: Options = {},
) => {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const doc = window.document;
    let timer: number | null = null;
    let target: HTMLElement | null = null;
    let pointerId: number | null = null;
    let lastPosition: {
      clientX: number;
      clientY: number;
      screenX: number;
      screenY: number;
    } | null = null;
    let originX = 0;
    let originY = 0;
    let pressSource: 'pointer' | 'touch' | null = null;

    const cancelLongPress = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (target) {
        target.classList.remove(activeClassName);
      }
      target = null;
      pointerId = null;
      lastPosition = null;
      pressSource = null;
    };

    const dispatchContextMenu = () => {
      if (!target || !lastPosition) {
        cancelLongPress();
        return;
      }

      const el = target;
      const { clientX, clientY, screenX, screenY } = lastPosition;

      cancelLongPress();

      const contextEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2,
        buttons: 2,
        clientX,
        clientY,
        screenX,
        screenY,
      });

      el.dispatchEvent(contextEvent);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pressSource !== 'pointer' || pointerId === null || event.pointerId !== pointerId) return;
      lastPosition = {
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
      };
      if (
        Math.abs(event.clientX - originX) > movementThreshold ||
        Math.abs(event.clientY - originY) > movementThreshold
      ) {
        cancelLongPress();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (pressSource !== 'pointer' || pointerId === null || event.pointerId !== pointerId) return;
      cancelLongPress();
    };

    const beginPress = (
      element: HTMLElement,
      position: { clientX: number; clientY: number; screenX: number; screenY: number },
      id: number | null,
      source: 'pointer' | 'touch',
    ) => {
      cancelLongPress();

      target = element;
      pointerId = typeof id === 'number' ? id : null;
      originX = position.clientX;
      originY = position.clientY;
      lastPosition = position;
      pressSource = source;

      element.classList.add(activeClassName);

      timer = window.setTimeout(() => {
        timer = null;
        dispatchContextMenu();
      }, delay);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
        return;
      }

      if (typeof event.button === 'number' && event.button > 0) {
        return;
      }

      const candidate = (event.target as HTMLElement | null)?.closest('[data-context]') as
        | HTMLElement
        | null;
      if (!candidate) {
        return;
      }

      beginPress(
        candidate,
        {
          clientX: event.clientX,
          clientY: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
        },
        event.pointerId,
        'pointer',
      );
    };

    const findTouchById = (touches: TouchList): Touch | null => {
      if (touches.length === 0) return null;
      if (pointerId === null) return touches.item(0);
      for (let i = 0; i < touches.length; i += 1) {
        const touch = touches.item(i);
        if (touch && touch.identifier === pointerId) {
          return touch;
        }
      }
      return null;
    };

    const handleTouchStart = (event: TouchEvent) => {
      const candidate = (event.target as HTMLElement | null)?.closest('[data-context]') as
        | HTMLElement
        | null;
      if (!candidate) {
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) {
        return;
      }

      beginPress(
        candidate,
        {
          clientX: touch.clientX,
          clientY: touch.clientY,
          screenX: touch.screenX,
          screenY: touch.screenY,
        },
        touch.identifier,
        'touch',
      );
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (pressSource !== 'touch') return;
      const touch = findTouchById(event.touches);
      if (!touch) {
        cancelLongPress();
        return;
      }

      lastPosition = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        screenX: touch.screenX,
        screenY: touch.screenY,
      };

      if (
        Math.abs(touch.clientX - originX) > movementThreshold ||
        Math.abs(touch.clientY - originY) > movementThreshold
      ) {
        cancelLongPress();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (pressSource !== 'touch') return;
      if (pointerId === null) {
        cancelLongPress();
        return;
      }
      for (let i = 0; i < event.changedTouches.length; i += 1) {
        const touch = event.changedTouches.item(i);
        if (touch && touch.identifier === pointerId) {
          cancelLongPress();
          break;
        }
      }
    };

    doc.addEventListener('pointerdown', handlePointerDown, { passive: true });
    doc.addEventListener('pointermove', handlePointerMove, { passive: true });
    doc.addEventListener('pointerup', handlePointerUp, { passive: true });
    doc.addEventListener('pointercancel', handlePointerUp, { passive: true });
    doc.addEventListener('touchstart', handleTouchStart, { passive: true });
    doc.addEventListener('touchmove', handleTouchMove, { passive: true });
    doc.addEventListener('touchend', handleTouchEnd, { passive: true });
    doc.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      doc.removeEventListener('pointerdown', handlePointerDown);
      doc.removeEventListener('pointermove', handlePointerMove);
      doc.removeEventListener('pointerup', handlePointerUp);
      doc.removeEventListener('pointercancel', handlePointerUp);
      doc.removeEventListener('touchstart', handleTouchStart);
      doc.removeEventListener('touchmove', handleTouchMove);
      doc.removeEventListener('touchend', handleTouchEnd);
      doc.removeEventListener('touchcancel', handleTouchEnd);
      cancelLongPress();
    };
  }, [delay, activeClassName, movementThreshold]);
};

export default useContextMenuLongPress;

