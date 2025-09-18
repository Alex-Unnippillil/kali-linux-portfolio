import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type SyntheticEvent } from 'react';

export interface TooltipOptions {
  openDelay?: number;
  closeDelay?: number;
}

export interface TooltipTimings {
  openDelay: number;
  closeDelay: number;
}

export interface TooltipControls {
  visible: boolean;
  show: (options?: { immediate?: boolean }) => void;
  hide: () => void;
  hideImmediate: () => void;
  getTriggerProps: <T extends Element>(props?: HTMLAttributes<T>) => HTMLAttributes<T>;
  timings: TooltipTimings;
}

export const DEFAULT_TOOLTIP_TIMINGS: TooltipTimings = Object.freeze({
  openDelay: 300,
  closeDelay: 120,
});

type Handler<E extends SyntheticEvent> = (event: E) => void;

function composeEventHandlers<E extends SyntheticEvent>(
  userHandler: Handler<E> | undefined,
  ourHandler: Handler<E> | undefined,
): Handler<E> {
  return (event: E) => {
    if (typeof userHandler === 'function') {
      userHandler(event);
    }
    if (!event.defaultPrevented && typeof ourHandler === 'function') {
      ourHandler(event);
    }
  };
}

export function useTooltip(options: TooltipOptions = {}): TooltipControls {
  const openDelay = options.openDelay ?? DEFAULT_TOOLTIP_TIMINGS.openDelay;
  const closeDelay = options.closeDelay ?? DEFAULT_TOOLTIP_TIMINGS.closeDelay;

  const [visible, setVisible] = useState(false);
  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimeout = useCallback(() => {
    if (openTimeout.current) {
      clearTimeout(openTimeout.current);
      openTimeout.current = null;
    }
  }, []);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }, []);

  const show = useCallback(
    (opts: { immediate?: boolean } = {}) => {
      const delay = opts.immediate ? 0 : openDelay;
      clearCloseTimeout();
      clearOpenTimeout();
      if (delay <= 0) {
        setVisible(true);
        return;
      }
      openTimeout.current = setTimeout(() => {
        setVisible(true);
        openTimeout.current = null;
      }, delay);
    },
    [clearCloseTimeout, clearOpenTimeout, openDelay],
  );

  const hide = useCallback(() => {
    clearOpenTimeout();
    if (closeDelay <= 0) {
      setVisible(false);
      return;
    }
    clearCloseTimeout();
    closeTimeout.current = setTimeout(() => {
      setVisible(false);
      closeTimeout.current = null;
    }, closeDelay);
  }, [clearCloseTimeout, clearOpenTimeout, closeDelay]);

  const hideImmediate = useCallback(() => {
    clearOpenTimeout();
    clearCloseTimeout();
    setVisible(false);
  }, [clearCloseTimeout, clearOpenTimeout]);

  useEffect(() => hideImmediate, [hideImmediate]);

  const getTriggerProps = useCallback(
    <T extends Element>(props: HTMLAttributes<T> = {} as HTMLAttributes<T>) => ({
      ...props,
      onMouseEnter: composeEventHandlers(props.onMouseEnter, () => show()),
      onMouseLeave: composeEventHandlers(props.onMouseLeave, () => hide()),
      onFocus: composeEventHandlers(props.onFocus, () => show({ immediate: true })),
      onBlur: composeEventHandlers(props.onBlur, () => hide()),
    }),
    [hide, show],
  );

  const timings = useMemo<TooltipTimings>(() => ({ openDelay, closeDelay }), [closeDelay, openDelay]);

  return useMemo(
    () => ({ visible, show, hide, hideImmediate, getTriggerProps, timings }),
    [getTriggerProps, hide, hideImmediate, show, timings, visible],
  );
}

export default useTooltip;
