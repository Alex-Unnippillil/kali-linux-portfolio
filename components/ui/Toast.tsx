import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
}

const TOAST_ROOT_ID = 'toast-root';

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dismissedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let root = document.getElementById(TOAST_ROOT_ID) as HTMLElement | null;
    if (!root) {
      root = document.createElement('div');
      root.id = TOAST_ROOT_ID;
      root.style.position = 'fixed';
      root.style.left = '0';
      root.style.right = '0';
      root.style.bottom = 'calc(env(safe-area-inset-bottom) + 16px)';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.alignItems = 'center';
      root.style.gap = '12px';
      root.style.pointerEvents = 'none';
      root.style.padding = '0 16px';
      root.style.zIndex = '2147483647';
      document.body.appendChild(root);
    }

    setPortalContainer(root);

    return () => {
      if (!root) return;
      requestAnimationFrame(() => {
        if (root && root.childElementCount === 0) {
          root.remove();
        }
      });
    };
  }, []);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const closeToast = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setVisible(false);
    clearTimer();
    const runClose = () => {
      onClose?.();
    };
    if (typeof window !== 'undefined') {
      window.setTimeout(runClose, 200);
    } else {
      runClose();
    }
  }, [onClose]);

  useEffect(() => {
    dismissedRef.current = false;
    setVisible(true);
    setDragX(0);
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      closeToast();
    }, duration);

    return () => {
      clearTimer();
    };
  }, [closeToast, duration, message]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    clearTimer();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;
    const deltaX = event.clientX - startXRef.current;
    setDragX(deltaX);
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    pointerIdRef.current = null;
    const deltaX = event.clientX - startXRef.current;
    const threshold = 80;
    if (Math.abs(deltaX) > threshold) {
      const viewportWidth =
        typeof window !== 'undefined' ? window.innerWidth : 320;
      setDragX(deltaX > 0 ? viewportWidth : -viewportWidth);
      closeToast();
      return;
    }

    setDragX(0);
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      closeToast();
    }, duration);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    pointerIdRef.current = null;
    setDragX(0);
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      closeToast();
    }, duration);
  };

  if (!portalContainer) {
    return null;
  }

  const transform = visible
    ? `translateX(${dragX}px) translateY(0) scale(1)`
    : `translateX(${dragX}px) translateY(16px) scale(0.97)`;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-auto w-full max-w-md rounded-md border border-gray-700 bg-gray-900 px-4 py-3 text-white shadow-lg transition-all duration-200 ease-out"
      style={{
        transform,
        opacity: visible ? 1 : 0,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={handlePointerCancel}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="flex-1 break-words text-sm leading-relaxed">{message}</span>
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="shrink-0 text-sm font-medium underline outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>,
    portalContainer,
  );
};

export default Toast;
