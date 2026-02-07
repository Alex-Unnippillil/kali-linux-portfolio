"use client";

import React, { useEffect, useRef, useState } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
  position?: 'top' | 'bottom';
}

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string; progress: string }> = {
  info: {
    bg: 'bg-slate-900/95',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400',
    progress: 'bg-cyan-400',
  },
  success: {
    bg: 'bg-slate-900/95',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    progress: 'bg-emerald-400',
  },
  warning: {
    bg: 'bg-slate-900/95',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    progress: 'bg-amber-400',
  },
  error: {
    bg: 'bg-slate-900/95',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    progress: 'bg-red-400',
  },
};

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  title,
  actionLabel,
  onAction,
  onClose,
  duration = 5000,
  position = 'bottom',
}) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const styles = TOAST_STYLES[type];
  const icon = TOAST_ICONS[type];

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 200);
  };

  useEffect(() => {
    // Animate in
    const showTimeout = setTimeout(() => setVisible(true), 10);

    // Progress bar animation
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(progressInterval);
      }
    }, 50);

    // Auto dismiss
    timeoutRef.current = setTimeout(handleClose, duration);

    return () => {
      clearTimeout(showTimeout);
      clearInterval(progressInterval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration]);

  const positionClasses = position === 'top'
    ? `top-4 ${visible && !exiting ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`
    : `bottom-4 ${visible && !exiting ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed left-1/2 -translate-x-1/2 z-[9999]
        max-w-sm w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[320px]
        ${styles.bg} ${styles.border}
        border backdrop-blur-xl
        rounded-xl shadow-2xl shadow-black/30
        overflow-hidden
        transform transition-all duration-300 ease-out
        ${positionClasses}
      `}
    >
      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
          {icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
          )}
          <p className="text-sm text-white/80 break-words">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onAction && actionLabel && (
            <button
              onClick={() => {
                onAction();
                handleClose();
              }}
              className={`text-xs font-semibold ${styles.icon} hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded px-1`}
            >
              {actionLabel}
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/5">
        <div
          className={`h-full ${styles.progress} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Toast;
