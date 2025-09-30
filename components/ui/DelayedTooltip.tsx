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
  onPointerEnter: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
  dismiss: () => void;
};

type DelayedTooltipProps = {
  content: ReactNode;
  delay?: number;
  children: (triggerProps: TriggerProps) => React.ReactElement;
};

const globalObject: typeof globalThis | undefined =
  typeof globalThis === 'object' ? globalThis : undefined;

const useIsomorphicLayoutEffect =
  globalObject && 'window' in globalObject ? useLayoutEffect : useEffect;

const DEFAULT_OFFSET = 8;
const TOUCH_EXTRA_DELAY = 400;

const prefersCoarsePointer = () => {
  const root =
    typeof globalThis !== 'undefined'
      ? (globalThis as typeof globalThis & {
          matchMedia?: typeof window.matchMedia;
        })
      : undefined;
  if (root?.matchMedia) {
    const query = root.matchMedia('(pointer: coarse)');
    if (query?.matches) {
      return true;
    }
  }
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 0
  ) {
    return true;
  }
  return false;
};

const derivePointerType = (
  event?: React.PointerEvent<HTMLElement>,
): 'mouse' | 'pen' | 'touch' => {
  const pointerType =
    (event?.nativeEvent as PointerEvent | undefined)?.pointerType ??
    event?.pointerType;
  if (pointerType === 'touch' || pointerType === 'pen') {
    return pointerType;
  }
  if (pointerType === 'mouse') {
    return 'mouse';
  }
  if (prefersCoarsePointer()) {
    return 'touch';
  }
  return 'mouse';
};

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
  const pointerTypeRef = useRef<'mouse' | 'pen' | 'touch' | 'keyboard'>('mouse');

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
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (pointerType?: 'mouse' | 'pen' | 'touch' | 'keyboard') => {
      clearTimer();
      if (pointerType) {
        pointerTypeRef.current = pointerType;
      }
      const activePointerType = pointerTypeRef.current;
      const effectiveDelay =
        activePointerType === 'touch' ? delay + TOUCH_EXTRA_DELAY : delay;
      if (typeof globalThis === 'undefined' || typeof setTimeout === 'undefined') {
        setVisible(true);
        return;
      }
      timerRef.current = setTimeout(() => {
        setVisible(true);
      }, effectiveDelay);
    },
    [clearTimer, delay],
  );

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      hide();
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [hide]);

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
    onPointerEnter: (event) => {
      show(derivePointerType(event));
    },
    onPointerLeave: () => {
      hide();
    },
    onPointerCancel: () => {
      hide();
    },
    onPointerDown: (event) => {
      pointerTypeRef.current = derivePointerType(event);
    },
    onFocus: () => {
      show('keyboard');
    },
    onBlur: () => {
      hide();
    },
    dismiss: hide,
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
