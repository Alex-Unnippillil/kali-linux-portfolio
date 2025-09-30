import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const closeToast = useCallback(() => {
    setVisible(false);
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = setTimeout(() => {
      onClose && onClose();
    }, 200);
  }, [onClose]);

  const startTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      closeToast();
    }, duration);
  }, [closeToast, duration]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointerIdRef.current = event.pointerId;
    startYRef.current = event.clientY;
    setIsDragging(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;

    const delta = event.clientY - startYRef.current;
    setDragOffset(delta > 0 ? delta : 0);
  }, [isDragging]);

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || pointerIdRef.current !== event.pointerId) return;

      const delta = event.clientY - startYRef.current;
      const shouldDismiss = delta > 80;

      pointerIdRef.current = null;
      setIsDragging(false);

      if (shouldDismiss) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        closeToast();
        return;
      }

      setDragOffset(0);
      event.currentTarget.releasePointerCapture(event.pointerId);
      startTimer();
    },
    [closeToast, isDragging, startTimer],
  );

  useEffect(() => {
    setVisible(true);
    startTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [startTimer]);

  const bottomOffset = 'calc(env(safe-area-inset-bottom, 0px) + 5rem + var(--toast-stack-offset, 0px))';
  const transform = visible
    ? `translateX(-50%) translateY(${dragOffset}px)`
    : `translateX(-50%) translateY(${dragOffset + 24}px)`;
  const transition = isDragging
    ? 'opacity 150ms ease'
    : 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms ease';

  return (
    <div
      role="status"
      aria-live="polite"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="fixed left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center rounded-md border border-gray-700 bg-gray-900 px-4 py-3 text-white shadow-md"
      style={{
        bottom: bottomOffset,
        transform,
        transition,
        opacity: visible ? 1 : 0,
        touchAction: 'pan-y',
      }}
    >
      <span>{message}</span>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="ml-4 underline focus:outline-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default Toast;
