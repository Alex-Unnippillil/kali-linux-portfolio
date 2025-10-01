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
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
};

type DelayedTooltipProps = {
  content: ReactNode;
  delay?: number;
  children: (triggerProps: TriggerProps) => React.ReactElement;
};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const DEFAULT_OFFSET = 8;
const ARROW_SIZE = 12;
const ARROW_SAFE_ZONE = 16;

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
  const pointerTypeRef = useRef<string | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [arrowOffset, setArrowOffset] = useState(ARROW_SAFE_ZONE);

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

  const show = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [clearTimer, delay]);

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
    pointerTypeRef.current = null;
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let nextPlacement: 'top' | 'bottom' = 'bottom';

    let top = triggerRect.bottom + DEFAULT_OFFSET;
    let left =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

    if (left < DEFAULT_OFFSET) {
      left = DEFAULT_OFFSET;
    }
    if (left + tooltipRect.width > viewportWidth - DEFAULT_OFFSET) {
      left = viewportWidth - tooltipRect.width - DEFAULT_OFFSET;
    }
    if (left < DEFAULT_OFFSET) {
      left = DEFAULT_OFFSET;
    }

    if (top + tooltipRect.height > viewportHeight - DEFAULT_OFFSET) {
      const flippedTop = triggerRect.top - tooltipRect.height - DEFAULT_OFFSET;
      if (flippedTop >= DEFAULT_OFFSET) {
        nextPlacement = 'top';
        top = flippedTop;
      } else {
        top = Math.max(
          DEFAULT_OFFSET,
          viewportHeight - tooltipRect.height - DEFAULT_OFFSET,
        );
      }
    }

    top = Math.min(
      Math.max(top, DEFAULT_OFFSET),
      Math.max(DEFAULT_OFFSET, viewportHeight - tooltipRect.height - DEFAULT_OFFSET),
    );

    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const rawArrowOffset = triggerCenter - left;
    let arrowMin = ARROW_SAFE_ZONE + ARROW_SIZE / 2;
    let arrowMax =
      tooltipRect.width - ARROW_SAFE_ZONE - ARROW_SIZE / 2;
    if (arrowMin > arrowMax) {
      const midpoint = tooltipRect.width / 2;
      arrowMin = midpoint;
      arrowMax = midpoint;
    }
    const clampedArrowOffset = Math.min(
      Math.max(rawArrowOffset, arrowMin),
      arrowMax,
    );

    setPosition({ top, left });
    setPlacement(nextPlacement);
    setArrowOffset(clampedArrowOffset);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!visible) {
      return;
    }
    updatePosition();
  }, [visible, updatePosition, content]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition, true);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition, true);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [visible, updatePosition]);

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
    onPointerDown: (event) => {
      pointerTypeRef.current = event.pointerType;
      if (event.pointerType === 'touch') {
        show();
      }
    },
    onPointerUp: (event) => {
      if (pointerTypeRef.current === 'touch' && event.pointerType === 'touch') {
        hide();
      }
    },
    onPointerLeave: (event) => {
      if (pointerTypeRef.current === 'touch' && event.pointerType === 'touch') {
        hide();
      }
    },
    onPointerCancel: (event) => {
      if (pointerTypeRef.current === 'touch' && event.pointerType === 'touch') {
        hide();
      }
    },
  };

  const renderedContent =
    React.isValidElement(content)
      ? React.cloneElement(content, { placement, arrowOffset })
      : content;

  return (
    <>
      {children(triggerProps)}
      {portalEl && visible
        ? createPortal(
            <div
              ref={tooltipRef}
              data-delayed-tooltip-content="true"
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 1000,
              }}
              className="pointer-events-none"
            >
              {renderedContent}
            </div>,
            portalEl,
          )
        : null}
    </>
  );
};

export default DelayedTooltip;
