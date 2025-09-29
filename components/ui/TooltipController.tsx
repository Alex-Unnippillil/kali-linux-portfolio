import React, {
  MutableRefObject,
  ReactElement,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const OPEN_DELAY_DEFAULT = 300;
const CLOSE_DELAY_DEFAULT = 150;
const LONG_PRESS_DELAY_DEFAULT = 600;
const VIEWPORT_MARGIN = 12;

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type TooltipTriggerProps = {
  ref: (node: HTMLElement | null) => void;
  onMouseEnter: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
  onTouchStart: (event: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLElement>) => void;
  onTouchCancel: (event: React.TouchEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
};

type TooltipControllerProps = {
  content: ReactNode;
  children: (triggerProps: TooltipTriggerProps) => ReactElement;
  openDelay?: number;
  closeDelay?: number;
  longPressDelay?: number;
  surfaceClassName?: string;
};

type Position = {
  top: number;
  left: number;
};

type PointerPosition = {
  x: number;
  y: number;
};

type TooltipCandidate = Position & {
  overflow: number;
  pointerTrapped: boolean;
};

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((refItem) => {
      if (!refItem) return;
      if (typeof refItem === 'function') {
        refItem(node);
      } else {
        try {
          (refItem as MutableRefObject<T | null>).current = node;
        } catch (error) {
          // Ignore updates to immutable refs
        }
      }
    });
  };
}

function composeEventHandlers<E>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void,
) {
  return (event: E) => {
    if (theirHandler) {
      theirHandler(event);
    }
    const nativeEvent = event as unknown as { defaultPrevented?: boolean };
    if (nativeEvent?.defaultPrevented) {
      return;
    }
    ourHandler(event);
  };
}

function calculateOverflow(
  top: number,
  left: number,
  width: number,
  height: number,
) {
  if (typeof window === 'undefined') {
    return 0;
  }
  const overflowTop = Math.max(VIEWPORT_MARGIN - top, 0);
  const overflowLeft = Math.max(VIEWPORT_MARGIN - left, 0);
  const overflowRight = Math.max(
    left + width + VIEWPORT_MARGIN - window.innerWidth,
    0,
  );
  const overflowBottom = Math.max(
    top + height + VIEWPORT_MARGIN - window.innerHeight,
    0,
  );
  return overflowTop + overflowLeft + overflowRight + overflowBottom;
}

const TooltipController: React.FC<TooltipControllerProps> = ({
  content,
  children,
  openDelay = OPEN_DELAY_DEFAULT,
  closeDelay = CLOSE_DELAY_DEFAULT,
  longPressDelay = LONG_PRESS_DELAY_DEFAULT,
  surfaceClassName,
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position>({
    top: -9999,
    left: -9999,
  });
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const suppressMouseRef = useRef(false);
  const suppressMouseTimeoutRef = useRef<number | null>(null);
  const [lastPointerPosition, setLastPointerPosition] =
    useState<PointerPosition | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.setAttribute('data-tooltip-root', 'true');
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      document.body.removeChild(el);
      setPortalEl(null);
    };
  }, []);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setIsOpen(false);
  }, [clearCloseTimer, clearOpenTimer]);

  const scheduleShow = useCallback(
    (delay: number) => {
      clearCloseTimer();
      clearOpenTimer();
      openTimerRef.current = window.setTimeout(() => {
        setIsOpen(true);
      }, delay);
    },
    [clearCloseTimer, clearOpenTimer],
  );

  const scheduleHide = useCallback(
    (delay: number) => {
      clearOpenTimer();
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        setIsOpen(false);
      }, delay);
    },
    [clearCloseTimer, clearOpenTimer],
  );

  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
      if (suppressMouseTimeoutRef.current !== null) {
        window.clearTimeout(suppressMouseTimeoutRef.current);
        suppressMouseTimeoutRef.current = null;
      }
    },
    [clearCloseTimer, clearOpenTimer],
  );

  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) {
      return;
    }
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const clamp = (value: number, min: number, max: number) => {
      if (value < min) return min;
      if (value > max) return max;
      return value;
    };

    const createCandidate = (baseTop: number, baseLeft: number): TooltipCandidate => {
      const maxLeft = viewportWidth - tooltipRect.width - VIEWPORT_MARGIN;
      const maxTop = viewportHeight - tooltipRect.height - VIEWPORT_MARGIN;
      const top = clamp(baseTop, VIEWPORT_MARGIN, maxTop);
      const left = clamp(baseLeft, VIEWPORT_MARGIN, maxLeft);
      const pointerTrapped = lastPointerPosition
        ? lastPointerPosition.x >= left &&
          lastPointerPosition.x <= left + tooltipRect.width &&
          lastPointerPosition.y >= top &&
          lastPointerPosition.y <= top + tooltipRect.height
        : false;
      const overflow = calculateOverflow(
        top,
        left,
        tooltipRect.width,
        tooltipRect.height,
      );
      return { top, left, pointerTrapped, overflow };
    };

    const centeredLeft =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    const centeredTop =
      triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;

    const candidates: TooltipCandidate[] = [
      createCandidate(triggerRect.bottom + VIEWPORT_MARGIN, centeredLeft),
      createCandidate(
        triggerRect.top - tooltipRect.height - VIEWPORT_MARGIN,
        centeredLeft,
      ),
      createCandidate(centeredTop, triggerRect.right + VIEWPORT_MARGIN),
      createCandidate(centeredTop, triggerRect.left - tooltipRect.width - VIEWPORT_MARGIN),
    ];

    const idealCandidate =
      candidates.find((candidate) => candidate.overflow === 0 && !candidate.pointerTrapped) ??
      candidates
        .filter((candidate) => !candidate.pointerTrapped)
        .sort((a, b) => a.overflow - b.overflow)[0] ??
      candidates.sort((a, b) => a.overflow - b.overflow)[0];

    if (idealCandidate) {
      setPosition({ top: idealCandidate.top, left: idealCandidate.left });
    }
  }, [isOpen, lastPointerPosition]);

  useIsomorphicLayoutEffect(() => {
    updatePosition();
  }, [isOpen, content, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => updatePosition());
    const triggerEl = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (triggerEl) observer.observe(triggerEl);
    if (tooltipEl) observer.observe(tooltipEl);
    return () => observer.disconnect();
  }, [isOpen, updatePosition]);

  const focusTriggerIfNeeded = useCallback(() => {
    if (typeof document === 'undefined') return;
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && triggerEl.contains(activeElement)) {
      triggerEl.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        hideTooltip();
        focusTriggerIfNeeded();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusTriggerIfNeeded, hideTooltip, isOpen]);

  const setTriggerNode = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (suppressMouseRef.current) {
        return;
      }
      setLastPointerPosition({ x: event.clientX, y: event.clientY });
      scheduleShow(openDelay);
    },
    [openDelay, scheduleShow],
  );

  const handleMouseLeave = useCallback(() => {
    if (suppressMouseRef.current) {
      return;
    }
    scheduleHide(closeDelay);
  }, [closeDelay, scheduleHide]);

  const handleFocus = useCallback(() => {
    setLastPointerPosition(null);
    scheduleShow(openDelay);
  }, [openDelay, scheduleShow]);

  const handleBlur = useCallback(() => {
    scheduleHide(closeDelay);
  }, [closeDelay, scheduleHide]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const touch = event.touches[0];
      if (touch) {
        setLastPointerPosition({ x: touch.clientX, y: touch.clientY });
      }
      suppressMouseRef.current = true;
      if (suppressMouseTimeoutRef.current !== null) {
        window.clearTimeout(suppressMouseTimeoutRef.current);
      }
      suppressMouseTimeoutRef.current = window.setTimeout(() => {
        suppressMouseRef.current = false;
        suppressMouseTimeoutRef.current = null;
      }, longPressDelay);
      scheduleShow(longPressDelay);
    },
    [longPressDelay, scheduleShow],
  );

  const endTouchInteraction = useCallback(() => {
    scheduleHide(closeDelay);
  }, [closeDelay, scheduleHide]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        hideTooltip();
        focusTriggerIfNeeded();
      }
    },
    [focusTriggerIfNeeded, hideTooltip],
  );

  const triggerElement = children({
    ref: setTriggerNode,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onTouchStart: handleTouchStart,
    onTouchEnd: endTouchInteraction,
    onTouchCancel: endTouchInteraction,
    onKeyDown: handleKeyDown,
  });

  const describedByIds = useMemo(() => {
    const ids = new Set<string>();
    const existing = triggerElement.props?.['aria-describedby'] as
      | string
      | undefined;
    if (existing) {
      existing
        .split(/\s+/)
        .filter(Boolean)
        .forEach((id) => ids.add(id));
    }
    if (isOpen) {
      ids.add(tooltipId);
    } else {
      ids.delete(tooltipId);
    }
    return Array.from(ids).join(' ') || undefined;
  }, [isOpen, tooltipId, triggerElement.props]);

  const clonedTrigger = React.cloneElement(triggerElement, {
    ref: mergeRefs(triggerElement.ref, setTriggerNode),
    onMouseEnter: composeEventHandlers(
      triggerElement.props?.onMouseEnter,
      handleMouseEnter,
    ),
    onMouseLeave: composeEventHandlers(
      triggerElement.props?.onMouseLeave,
      handleMouseLeave,
    ),
    onFocus: composeEventHandlers(triggerElement.props?.onFocus, handleFocus),
    onBlur: composeEventHandlers(triggerElement.props?.onBlur, handleBlur),
    onTouchStart: composeEventHandlers(
      triggerElement.props?.onTouchStart,
      handleTouchStart,
    ),
    onTouchEnd: composeEventHandlers(
      triggerElement.props?.onTouchEnd,
      endTouchInteraction,
    ),
    onTouchCancel: composeEventHandlers(
      triggerElement.props?.onTouchCancel,
      endTouchInteraction,
    ),
    onKeyDown: composeEventHandlers(
      triggerElement.props?.onKeyDown,
      handleKeyDown,
    ),
    'aria-describedby': describedByIds,
  });

  if (!portalEl) {
    return clonedTrigger;
  }

  return (
    <>
      {clonedTrigger}
      {isOpen
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              ref={tooltipRef}
              className={
                surfaceClassName ??
                'pointer-events-auto max-w-xs rounded-md border border-gray-500/60 bg-ub-grey/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur'
              }
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 1300,
              }}
            >
              {content}
            </div>,
            portalEl,
          )
        : null}
    </>
  );
};

export type { TooltipTriggerProps };
export default TooltipController;
