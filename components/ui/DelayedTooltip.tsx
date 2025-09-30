import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type TriggerProps = {
  ref: (node: HTMLElement | null) => void;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
};

type DelayedTooltipProps = {
  content: ReactNode;
  delay?: number;
  children: (triggerProps: TriggerProps) => React.ReactElement;
};

const isBrowser = () =>
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as typeof globalThis & { document?: unknown }).document !== 'undefined';

const useIsomorphicLayoutEffect = isBrowser() ? useLayoutEffect : useEffect;

const DEFAULT_OFFSET = 8;
const AUTO_DISMISS_DELAY = 2000;

const getTimestamp = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const DelayedTooltip: React.FC<DelayedTooltipProps> = ({
  content,
  delay = 300,
  children,
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const showTimerRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const pressStartRef = useRef<number | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.setAttribute('data-delayed-tooltip', 'true');
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      document.body.removeChild(el);
      setPortalEl(null);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearTimer();
    clearDismissTimer();
    showTimerRef.current = window.setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [clearDismissTimer, clearTimer, delay]);

  const hide = useCallback(() => {
    clearTimer();
    clearDismissTimer();
    setVisible(false);
  }, [clearDismissTimer, clearTimer]);

  const showInstantly = useCallback(() => {
    clearTimer();
    clearDismissTimer();
    setVisible(true);
  }, [clearDismissTimer, clearTimer]);

  const scheduleDismiss = useCallback(() => {
    clearDismissTimer();
    dismissTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, AUTO_DISMISS_DELAY);
  }, [clearDismissTimer]);

  useEffect(
    () => () => {
      clearTimer();
      clearDismissTimer();
    },
    [clearDismissTimer, clearTimer],
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    const maxLeft = Math.max(
      DEFAULT_OFFSET,
      viewportWidth - tooltipRect.width - DEFAULT_OFFSET,
    );
    if (left < DEFAULT_OFFSET) {
      left = DEFAULT_OFFSET;
    }
    if (left > maxLeft) {
      left = maxLeft;
    }

    let top = triggerRect.bottom + DEFAULT_OFFSET;
    const fitsBelow = top + tooltipRect.height <= viewportHeight - DEFAULT_OFFSET;
    if (!fitsBelow) {
      const aboveTop = triggerRect.top - tooltipRect.height - DEFAULT_OFFSET;
      if (aboveTop >= DEFAULT_OFFSET) {
        top = aboveTop;
      } else {
        top = viewportHeight - tooltipRect.height - DEFAULT_OFFSET;
      }
    }

    const maxTop = Math.max(
      DEFAULT_OFFSET,
      viewportHeight - tooltipRect.height - DEFAULT_OFFSET,
    );
    if (top < DEFAULT_OFFSET) {
      top = DEFAULT_OFFSET;
    }
    if (top > maxTop) {
      top = maxTop;
    }

    setPosition({ top, left });
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!visible) {
      return;
    }
    updatePosition();
  }, [visible, content, updatePosition]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const handleReposition = () => {
      updatePosition();
    };
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [updatePosition, visible]);

  const getNow = () =>
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }
      pressStartRef.current = getTimestamp();
      clearDismissTimer();
      show();
    },
    [clearDismissTimer, show],
  );

  const handlePointerUp = useCallback(() => {
    const startedAt = pressStartRef.current;
    pressStartRef.current = null;
    const pressDuration = startedAt ? getTimestamp() - startedAt : 0;
    clearTimer();
    if (pressDuration < delay) {
      showInstantly();
    }
    scheduleDismiss();
  }, [clearTimer, delay, scheduleDismiss, showInstantly]);

  const handlePointerLeave = useCallback(() => {
    pressStartRef.current = null;
    hide();
  }, [hide]);

  const handlePointerCancel = useCallback(() => {
    pressStartRef.current = null;
    hide();
  }, [hide]);

  const triggerProps: TriggerProps = {
    ref: (node) => {
      triggerRef.current = node;
    },
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    onPointerCancel: handlePointerCancel,
    onFocus: () => {
      show();
    },
    onBlur: () => {
      hide();
    },
  };

  const tooltipMaxWidth = `min(20rem, calc(100vw - ${DEFAULT_OFFSET * 2}px))`;

  return (
    <>
      {children(triggerProps)}
      {portalEl && visible
        ? createPortal(
            <div
              ref={tooltipRef}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 1000,
                maxWidth: tooltipMaxWidth,
              }}
              className="pointer-events-none max-w-xs rounded-md border border-gray-500/60 bg-ub-grey/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur"
            >
              {content}
            </div>,
            portalEl,
          )
        : null}
    </>
  );
};

export default DelayedTooltip;
