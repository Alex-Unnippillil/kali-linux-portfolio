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
  onMouseEnter: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
};

type DelayedTooltipProps = {
  content: ReactNode;
  delay?: number;
  id?: string;
  children: (triggerProps: TriggerProps) => React.ReactElement;
};

const getDocument = () => {
  if (typeof globalThis === 'undefined') return null;
  const maybeDocument = (globalThis as typeof globalThis & { document?: Document }).document;
  return maybeDocument ?? null;
};

const useIsomorphicLayoutEffect = getDocument() ? useLayoutEffect : useEffect;

const DEFAULT_OFFSET = 8;

const DelayedTooltip: React.FC<DelayedTooltipProps> = ({
  content,
  delay = 300,
  id,
  children,
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timerRef = useRef<number | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const doc = getDocument();
    if (!doc || !doc.body) return;
    const el = doc.createElement('div');
    el.setAttribute('data-delayed-tooltip', 'true');
    doc.body.appendChild(el);
    setPortalEl(el);
    return () => {
      doc.body?.removeChild(el);
      setPortalEl(null);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      globalThis.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearTimer();
    timerRef.current = globalThis.setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [clearTimer, delay]);

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useIsomorphicLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) {
      return;
    }
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth =
      typeof globalThis !== 'undefined' && typeof globalThis.innerWidth === 'number'
        ? globalThis.innerWidth
        : triggerRect.right;
    const viewportHeight =
      typeof globalThis !== 'undefined' && typeof globalThis.innerHeight === 'number'
        ? globalThis.innerHeight
        : triggerRect.bottom;

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
      hide();
    },
    onFocus: () => {
      show();
    },
    onBlur: () => {
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
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 1000,
              }}
              id={id}
              role="tooltip"
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
