import React, {
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type TriggerProps = {
  ref: (node: HTMLElement | null) => void;
  onMouseEnter: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
};

type DelayedTooltipProps = {
  content: ReactNode;
  delay?: number;
  children: (triggerProps: TriggerProps) => React.ReactElement;
};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const DEFAULT_OFFSET = 8;

const DelayedTooltip: React.FC<DelayedTooltipProps> = ({
  content,
  delay = 300,
  children,
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timerRef = useRef<number | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const previousDescribedByRef = useRef<string | null | undefined>(undefined);
  const hasActiveDescribedByRef = useRef(false);
  const tooltipId = useId();
  const tooltipElementId = `delayed-tooltip-${tooltipId}`;

  const appendTooltipDescribedBy = useCallback(
    (target: HTMLElement) => {
      const existing = target.getAttribute('aria-describedby');
      if (previousDescribedByRef.current === undefined) {
        previousDescribedByRef.current = existing;
      }
      const tokens = existing
        ? existing
            .split(/\s+/)
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
      if (!tokens.includes(tooltipElementId)) {
        tokens.push(tooltipElementId);
        target.setAttribute('aria-describedby', tokens.join(' '));
      }
      focusTargetRef.current = target;
      hasActiveDescribedByRef.current = true;
    },
    [tooltipElementId],
  );

  const removeTooltipDescribedBy = useCallback((target: HTMLElement) => {
    const previous = previousDescribedByRef.current;
    const trimmedPrevious = typeof previous === 'string' ? previous.trim() : previous;
    if (typeof trimmedPrevious === 'string' && trimmedPrevious.length > 0) {
      target.setAttribute('aria-describedby', trimmedPrevious);
    } else {
      target.removeAttribute('aria-describedby');
    }
    if (focusTargetRef.current === target) {
      focusTargetRef.current = null;
    }
    previousDescribedByRef.current = undefined;
    hasActiveDescribedByRef.current = false;
  }, []);

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
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (immediate = false) => {
      clearTimer();
      if (immediate) {
        setVisible(true);
        return;
      }
      timerRef.current = window.setTimeout(() => {
        setVisible(true);
      }, delay);
    },
    [clearTimer, delay],
  );

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    const target = focusTargetRef.current;
    if (!target) {
      return;
    }

    if (visible) {
      appendTooltipDescribedBy(target);
      return () => {
        if (hasActiveDescribedByRef.current) {
          removeTooltipDescribedBy(target);
        }
      };
    }

    if (hasActiveDescribedByRef.current) {
      removeTooltipDescribedBy(target);
    }
  }, [visible, appendTooltipDescribedBy, removeTooltipDescribedBy]);

  useIsomorphicLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) {
      return;
    }
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = triggerRect.bottom + DEFAULT_OFFSET;
    let left =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

    if (left < DEFAULT_OFFSET) {
      left = DEFAULT_OFFSET;
    }
    if (left + tooltipRect.width > viewportWidth - DEFAULT_OFFSET) {
      left = viewportWidth - tooltipRect.width - DEFAULT_OFFSET;
    }

    if (top + tooltipRect.height > viewportHeight - DEFAULT_OFFSET) {
      top = triggerRect.top - tooltipRect.height - DEFAULT_OFFSET;
      if (top < DEFAULT_OFFSET) {
        top = Math.max(
          DEFAULT_OFFSET,
          viewportHeight - tooltipRect.height - DEFAULT_OFFSET,
        );
      }
    }

    setPosition({ top, left });
  }, [visible, content]);

  const triggerProps: TriggerProps = {
    ref: (node) => {
      triggerRef.current = node;
    },
    onMouseEnter: () => {
      show();
    },
    onMouseLeave: () => {
      if (
        focusTargetRef.current &&
        typeof document !== 'undefined' &&
        document.activeElement === focusTargetRef.current
      ) {
        return;
      }
      hide();
    },
    onFocus: (event) => {
      const target = event.target as HTMLElement;
      appendTooltipDescribedBy(target);
      show(true);
    },
    onBlur: (event) => {
      const target = event.target as HTMLElement;
      if (hasActiveDescribedByRef.current) {
        removeTooltipDescribedBy(target);
      } else if (focusTargetRef.current === target) {
        focusTargetRef.current = null;
      }
      hide();
    },
  };

  return (
    <>
      {children(triggerProps)}
      {portalEl && visible
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipElementId}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 1000,
              }}
              className="pointer-events-none max-w-xs rounded-md border border-gray-500/60 bg-ub-grey/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur"
              role="tooltip"
              aria-hidden={visible ? 'false' : 'true'}
              tabIndex={-1}
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
