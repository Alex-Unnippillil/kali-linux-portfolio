import React, { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

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
  const [visible, setVisible] = useState(false);
  const { toastPlacement, toastFadeOut } = useSettings();
  const mousePosRef = useRef({ x: 0, y: 0 });
  const spawnRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useEffect(() => {
    if (toastPlacement === 'mouse') {
      spawnRef.current = { ...mousePosRef.current };
    }
  }, [toastPlacement]);

  useEffect(() => {
    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      if (toastFadeOut) {
        setVisible(false);
        setTimeout(() => onClose && onClose(), 200);
      } else {
        onClose && onClose();
      }
    }, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onClose, toastFadeOut]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed transform bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md flex items-center transition-opacity transition-transform duration-150 ease-in-out ${toastPlacement === 'primary' ? 'top-4 left-1/2 -translate-x-1/2' : ''} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}
      style={
        toastPlacement === 'mouse' && spawnRef.current
          ? { top: spawnRef.current.y + 16, left: spawnRef.current.x + 16 }
          : undefined
      }
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
