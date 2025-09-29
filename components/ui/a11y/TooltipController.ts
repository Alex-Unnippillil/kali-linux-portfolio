import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type ReactNode,
} from 'react';

type TooltipId = string;

type TooltipTimingOptions = {
  delay?: number;
};

type TooltipControllerContextValue = {
  openTooltipId: TooltipId | null;
  showTooltip: (id: TooltipId, options?: TooltipTimingOptions) => void;
  hideTooltip: (id?: TooltipId, options?: TooltipTimingOptions) => void;
  isTooltipVisible: (id: TooltipId) => boolean;
};

export type TooltipControllerProviderProps = {
  children: ReactNode;
  openDelay?: number;
  closeDelay?: number;
};

const TooltipControllerContext = createContext<TooltipControllerContextValue | undefined>(undefined);

export const TooltipControllerProvider = ({
  children,
  openDelay = 500,
  closeDelay = 100,
}: TooltipControllerProviderProps) => {
  const [openTooltipId, setOpenTooltipId] = useState<TooltipId | null>(null);
  const openTimers = useRef<Map<TooltipId, ReturnType<typeof setTimeout>>>(new Map());
  const closeTimers = useRef<Map<TooltipId, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimers = useCallback((map: Map<TooltipId, ReturnType<typeof setTimeout>>, id?: TooltipId) => {
    if (typeof id === 'undefined') {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
      return;
    }
    const timer = map.get(id);
    if (timer) {
      clearTimeout(timer);
      map.delete(id);
    }
  }, []);

  const showTooltip = useCallback(
    (id: TooltipId, options?: TooltipTimingOptions) => {
      const delay = options?.delay ?? openDelay;
      clearTimers(closeTimers.current, id);
      clearTimers(openTimers.current, id);

      const timer = setTimeout(() => {
        setOpenTooltipId(id);
        openTimers.current.delete(id);
      }, Math.max(delay, 0));
      openTimers.current.set(id, timer);
    },
    [openDelay, clearTimers],
  );

  const hideTooltip = useCallback(
    (id?: TooltipId, options?: TooltipTimingOptions) => {
      const targetId = id ?? openTooltipId;
      if (!targetId) return;
      const delay = options?.delay ?? closeDelay;
      clearTimers(openTimers.current, targetId);
      clearTimers(closeTimers.current, targetId);

      const timer = setTimeout(() => {
        if (openTooltipId === targetId) {
          setOpenTooltipId(null);
        }
        closeTimers.current.delete(targetId);
      }, Math.max(delay, 0));
      closeTimers.current.set(targetId, timer);
    },
    [closeDelay, openTooltipId, clearTimers],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideTooltip(undefined, { delay: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [hideTooltip]);

  useEffect(() => {
    return () => {
      clearTimers(openTimers.current);
      clearTimers(closeTimers.current);
    };
  }, [clearTimers]);

  const isTooltipVisible = useCallback(
    (id: TooltipId) => openTooltipId === id,
    [openTooltipId],
  );

  const value = useMemo<TooltipControllerContextValue>(
    () => ({ openTooltipId, showTooltip, hideTooltip, isTooltipVisible }),
    [openTooltipId, showTooltip, hideTooltip, isTooltipVisible],
  );

  return <TooltipControllerContext.Provider value={value}>{children}</TooltipControllerContext.Provider>;
};

export const useTooltipController = () => {
  const context = useContext(TooltipControllerContext);
  if (!context) {
    throw new Error('useTooltipController must be used within a TooltipControllerProvider');
  }
  return context;
};

type UseTooltipTriggerOptions = {
  openDelay?: number;
  closeDelay?: number;
  disabled?: boolean;
};

type TriggerProps = {
  onFocus: React.FocusEventHandler<HTMLElement>;
  onBlur: React.FocusEventHandler<HTMLElement>;
  onMouseEnter: React.MouseEventHandler<HTMLElement>;
  onMouseLeave: React.MouseEventHandler<HTMLElement>;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  'aria-describedby'?: string;
  'data-tooltip-open'?: boolean;
};

export const useTooltipTrigger = (
  tooltipId: TooltipId,
  { openDelay, closeDelay, disabled = false }: UseTooltipTriggerOptions = {},
): TriggerProps => {
  const { showTooltip, hideTooltip, isTooltipVisible } = useTooltipController();

  const show = useCallback(() => {
    if (disabled) return;
    showTooltip(tooltipId, { delay: openDelay });
  }, [showTooltip, tooltipId, openDelay, disabled]);

  const hide = useCallback(() => {
    hideTooltip(tooltipId, { delay: closeDelay });
  }, [hideTooltip, tooltipId, closeDelay]);

  const handleFocus: TriggerProps['onFocus'] = useCallback(
    (event) => {
      if (disabled) return;
      show();
      event.stopPropagation();
    },
    [show, disabled],
  );

  const handleBlur: TriggerProps['onBlur'] = useCallback(
    (event) => {
      hide();
      event.stopPropagation();
    },
    [hide],
  );

  const handleMouseEnter: TriggerProps['onMouseEnter'] = useCallback(
    (event) => {
      if (disabled) return;
      show();
      event.stopPropagation();
    },
    [show, disabled],
  );

  const handleMouseLeave: TriggerProps['onMouseLeave'] = useCallback(
    (event) => {
      hide();
      event.stopPropagation();
    },
    [hide],
  );

  const handleKeyDown: KeyboardEventHandler<HTMLElement> = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        hideTooltip(undefined, { delay: 0 });
        event.stopPropagation();
      }
    },
    [hideTooltip],
  );

  const isVisible = isTooltipVisible(tooltipId);

  return {
    onFocus: handleFocus,
    onBlur: handleBlur,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onKeyDown: handleKeyDown,
    'aria-describedby': isVisible ? tooltipId : undefined,
    'data-tooltip-open': isVisible || undefined,
  };
};

type UseTooltipOptions = {
  id: TooltipId;
};

type TooltipHookResult = {
  isVisible: boolean;
  getTooltipProps: (props?: HTMLAttributes<HTMLElement>) => HTMLAttributes<HTMLElement>;
};

export const useTooltip = ({ id }: UseTooltipOptions): TooltipHookResult => {
  const { isTooltipVisible } = useTooltipController();
  const isVisible = isTooltipVisible(id);

  const getTooltipProps = useCallback(
    (props: HTMLAttributes<HTMLElement> = {}) => ({
      role: 'tooltip',
      id,
      ...props,
      hidden: !isVisible,
      'data-state': isVisible ? 'open' : 'closed',
    }),
    [id, isVisible],
  );

  return { isVisible, getTooltipProps };
};
