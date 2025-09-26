import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onAction?: () => void;
}

export interface ToastOptions {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
  onClose?: () => void;
}

interface ToastInternal extends Required<Pick<ToastOptions, 'description'>> {
  id: string;
  title?: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
  onClose?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string) => string;
  info: (description: string, options?: Omit<ToastOptions, 'description' | 'variant'>) => string;
  success: (description: string, options?: Omit<ToastOptions, 'description' | 'variant'>) => string;
  error: (description: string, options?: Omit<ToastOptions, 'description' | 'variant'>) => string;
  dismiss: (id?: string) => void;
}

const DEFAULT_DURATION = 6000;
const EXIT_ANIMATION_DURATION = 200;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToasterProvider');
  }
  return context;
};

interface ToastViewProps {
  toast: ToastInternal;
  visible: boolean;
  prefersReducedMotion: boolean;
  onDismiss: () => void;
  actionRef: React.RefObject<HTMLButtonElement>;
  containerRef: React.RefObject<HTMLDivElement>;
}

const variantClasses: Record<ToastVariant, string> = {
  info: 'border-blue-400/50 bg-slate-900/95 text-slate-50',
  success: 'border-emerald-400/50 bg-emerald-900/95 text-emerald-50',
  error: 'border-rose-400/50 bg-rose-900/95 text-rose-50',
};

const closeButtonStyles =
  'rounded-md p-1 text-xs font-medium text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/80';

const actionButtonStyles =
  'rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/80';

export const ToastView: React.FC<ToastViewProps> = ({
  toast,
  visible,
  prefersReducedMotion,
  onDismiss,
  actionRef,
  containerRef,
}) => {
  const role = toast.variant === 'error' ? 'alert' : 'status';
  const ariaLive = toast.variant === 'error' ? 'assertive' : 'polite';
  const transitionClasses = prefersReducedMotion
    ? ''
    : 'transform transition-all duration-200 ease-out';
  const visibilityClasses = prefersReducedMotion
    ? visible
      ? 'opacity-100'
      : 'opacity-0'
    : visible
    ? 'translate-y-0 opacity-100'
    : '-translate-y-2 opacity-0';

  return (
    <div
      ref={containerRef}
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      tabIndex={toast.action ? -1 : undefined}
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-lg border px-4 py-3 shadow-lg outline-none ${variantClasses[toast.variant]} ${transitionClasses} ${visibilityClasses}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {toast.title && (
            <p className="text-sm font-semibold text-white/90">{toast.title}</p>
          )}
          <p className="text-sm leading-5 text-white/90">{toast.description}</p>
        </div>
        {toast.action && (
          <button
            ref={actionRef}
            type="button"
            onClick={() => {
              toast.action?.onAction?.();
              onDismiss();
            }}
            className={actionButtonStyles}
          >
            {toast.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className={closeButtonStyles}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const ToasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [queue, setQueue] = useState<ToastInternal[]>([]);
  const [active, setActive] = useState<ToastInternal | null>(null);
  const [visible, setVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const idRef = useRef(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    if (typeof media.addListener === 'function') {
      media.addListener(handleChange);
      return () => media.removeListener(handleChange);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!active && queue.length > 0) {
      setActive(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [queue, active]);

  const clearHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const clearExitTimer = () => {
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  };

  const cancelFocusFrame = () => {
    if (focusFrameRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
  };

  const finalizeDismiss = useCallback(
    (toast?: ToastInternal) => {
      if (toast?.onClose) {
        toast.onClose();
      }
      setActive(null);
      setVisible(false);
      if (restoreFocusRef.current) {
        const previous = previousFocusRef.current;
        if (previous && typeof previous.focus === 'function') {
          previous.focus({ preventScroll: true });
        }
      }
      previousFocusRef.current = null;
      restoreFocusRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!active) {
      clearHideTimer();
      cancelFocusFrame();
      return;
    }

    setVisible(true);

    if (active.action && typeof document !== 'undefined') {
      const activeElement = document.activeElement;
      previousFocusRef.current =
        activeElement instanceof HTMLElement ? activeElement : null;
      restoreFocusRef.current = true;
      if (typeof window !== 'undefined') {
        focusFrameRef.current = window.requestAnimationFrame(() => {
          const actionEl = actionRef.current || containerRef.current;
          actionEl?.focus({ preventScroll: true });
        });
      }
    } else {
      previousFocusRef.current = null;
      restoreFocusRef.current = false;
    }

    clearHideTimer();
    const duration = active.duration;
    if (Number.isFinite(duration) && duration > 0) {
      hideTimeoutRef.current = setTimeout(() => setVisible(false), duration);
    }

    return () => {
      clearHideTimer();
      cancelFocusFrame();
    };
  }, [active]);

  useEffect(() => {
    if (!active || visible) return;

    clearExitTimer();
    const delay = prefersReducedMotion ? 0 : EXIT_ANIMATION_DURATION;
    const closingToast = active;
    exitTimeoutRef.current = setTimeout(() => {
      finalizeDismiss(closingToast);
    }, delay);

    return () => {
      clearExitTimer();
    };
  }, [active, visible, finalizeDismiss, prefersReducedMotion]);

  useEffect(
    () => () => {
      clearHideTimer();
      clearExitTimer();
      cancelFocusFrame();
    },
    [],
  );

  const showToast = useCallback(
    (input: ToastOptions | string) => {
      const options: ToastOptions =
        typeof input === 'string' ? { description: input } : input;
      const id = `toast-${++idRef.current}`;
      const toast: ToastInternal = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'info',
        duration: options.duration ?? DEFAULT_DURATION,
        action: options.action,
        onClose: options.onClose,
      };
      setQueue((prev) => [...prev, toast]);
      return id;
    },
    [],
  );

  const info = useCallback(
    (description: string, options?: Omit<ToastOptions, 'description' | 'variant'>) =>
      showToast({ ...options, description, variant: 'info' }),
    [showToast],
  );

  const success = useCallback(
    (description: string, options?: Omit<ToastOptions, 'description' | 'variant'>) =>
      showToast({ ...options, description, variant: 'success' }),
    [showToast],
  );

  const error = useCallback(
    (description: string, options?: Omit<ToastOptions, 'description' | 'variant'>) =>
      showToast({ ...options, description, variant: 'error' }),
    [showToast],
  );

  const dismiss = useCallback(
    (id?: string) => {
      if (!id) {
        if (active) {
          setVisible(false);
        }
        return;
      }
      setQueue((prev) => prev.filter((toast) => toast.id !== id));
      if (active?.id === id) {
        setVisible(false);
      }
    },
    [active],
  );

  const contextValue = useMemo(
    () => ({ showToast, info, success, error, dismiss }),
    [showToast, info, success, error, dismiss],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {active && (
        <div className="pointer-events-none fixed top-4 left-1/2 z-[999] flex w-full -translate-x-1/2 justify-center px-4 sm:left-auto sm:right-4 sm:translate-x-0 sm:justify-end">
          <ToastView
            toast={active}
            visible={visible}
            prefersReducedMotion={prefersReducedMotion}
            onDismiss={() => setVisible(false)}
            actionRef={actionRef}
            containerRef={containerRef}
          />
        </div>
      )}
    </ToastContext.Provider>
  );
};

export default ToasterProvider;
