import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './DelayedTooltip.module.css';

type TriggerProps = {
  ref: (node: HTMLElement | null) => void;
  onMouseEnter: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
};

type Placement = 'top' | 'bottom' | 'left' | 'right';

type TooltipPosition = {
  top: number;
  left: number;
  placement: Placement;
  arrowOffset: { x: number; y: number };
};

type TooltipInlineStyle = React.CSSProperties & {
  '--tooltip-arrow-x'?: string;
  '--tooltip-arrow-y'?: string;
  '--tooltip-arrow-offset'?: string;
};

type DelayedTooltipProps = {
  content: ReactNode;
  delay?: number;
  children: (triggerProps: TriggerProps) => React.ReactElement;
};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const DEFAULT_OFFSET = 8;
const DEFAULT_OPEN_DELAY = 150;
const ARROW_SAFE_OFFSET = 8;

type CalculatePositionArgs = {
  triggerRect: DOMRect;
  tooltipRect: DOMRect;
  viewportWidth: number;
  viewportHeight: number;
  offset?: number;
  arrowOffset?: number;
};

export function calculateTooltipPosition({
  triggerRect,
  tooltipRect,
  viewportWidth,
  viewportHeight,
  offset = DEFAULT_OFFSET,
  arrowOffset = ARROW_SAFE_OFFSET,
}: CalculatePositionArgs): TooltipPosition {
  const spaces = {
    top: triggerRect.top,
    bottom: viewportHeight - triggerRect.bottom,
    left: triggerRect.left,
    right: viewportWidth - triggerRect.right,
  };

  const fitsBottom = spaces.bottom >= tooltipRect.height + offset;
  const fitsTop = spaces.top >= tooltipRect.height + offset;
  const fitsRight = spaces.right >= tooltipRect.width + offset;
  const fitsLeft = spaces.left >= tooltipRect.width + offset;

  let placement: Placement = 'bottom';
  if (fitsBottom) {
    placement = 'bottom';
  } else if (fitsTop) {
    placement = 'top';
  } else if (fitsRight) {
    placement = 'right';
  } else if (fitsLeft) {
    placement = 'left';
  } else {
    placement = (Object.entries(spaces) as Array<[Placement, number]>).reduce(
      (prev, current) => (current[1] > prev[1] ? (current as [Placement, number]) : prev),
    )[0];
  }

  let top = 0;
  let left = 0;

  if (placement === 'bottom') {
    top = triggerRect.bottom + offset;
    left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
  } else if (placement === 'top') {
    top = triggerRect.top - tooltipRect.height - offset;
    left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
  } else if (placement === 'right') {
    top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
    left = triggerRect.right + offset;
  } else {
    top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
    left = triggerRect.left - tooltipRect.width - offset;
  }

  const minLeft = offset;
  const maxLeft = viewportWidth - tooltipRect.width - offset;
  const minTop = offset;
  const maxTop = viewportHeight - tooltipRect.height - offset;

  const clamp = (value: number, min: number, max: number) => {
    if (max < min) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  };

  left = clamp(left, minLeft, maxLeft);
  top = clamp(top, minTop, maxTop);

  let arrowX = tooltipRect.width / 2;
  let arrowY = tooltipRect.height / 2;

  if (placement === 'bottom' || placement === 'top') {
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const min = arrowOffset;
    const max = tooltipRect.width - arrowOffset;
    arrowX = clamp(triggerCenterX - left, min, max);
    arrowY = placement === 'bottom' ? 0 : tooltipRect.height;
  } else {
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;
    const min = arrowOffset;
    const max = tooltipRect.height - arrowOffset;
    arrowY = clamp(triggerCenterY - top, min, max);
    arrowX = placement === 'right' ? 0 : tooltipRect.width;
  }

  return {
    top,
    left,
    placement,
    arrowOffset: { x: arrowX, y: arrowY },
  };
}

const DelayedTooltip: React.FC<DelayedTooltipProps> = ({
  content,
  delay = DEFAULT_OPEN_DELAY,
  children,
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: 'bottom',
    arrowOffset: { x: 0, y: 0 },
  });
  const timerRef = useRef<number | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    setPrefersReducedMotion(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
    return undefined;
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

  const show = useCallback(() => {
    clearTimer();
    const effectiveDelay = prefersReducedMotion ? 0 : delay;
    if (effectiveDelay <= 0) {
      setVisible(true);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setVisible(true);
      timerRef.current = null;
    }, effectiveDelay);
  }, [clearTimer, delay, prefersReducedMotion]);

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
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
    const nextPosition = calculateTooltipPosition({
      triggerRect,
      tooltipRect,
      viewportWidth,
      viewportHeight,
      offset: DEFAULT_OFFSET,
      arrowOffset: ARROW_SAFE_OFFSET,
    });
    setPosition(nextPosition);
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
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
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
  };

  const tooltipStyle: TooltipInlineStyle = {
    top: position.top,
    left: position.left,
    '--tooltip-arrow-x': `${position.arrowOffset.x}px`,
    '--tooltip-arrow-y': `${position.arrowOffset.y}px`,
    '--tooltip-arrow-offset': `${ARROW_SAFE_OFFSET}px`,
  };

  return (
    <>
      {children(triggerProps)}
      {portalEl && visible
        ? createPortal(
            <div
              ref={tooltipRef}
              className={styles.tooltip}
              data-placement={position.placement}
              style={tooltipStyle}
            >
              <div className={styles.arrow} aria-hidden="true">
                <span className="block h-full w-full transform rotate-45 rounded-sm border border-gray-500/60 bg-ub-grey/95" />
              </div>
              <div
                className={`${styles.content} max-w-xs rounded-md border border-gray-500/60 bg-ub-grey/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur`}
              >
                {content}
              </div>
            </div>,
            portalEl,
          )
        : null}
    </>
  );
};

export default DelayedTooltip;
