import type {
  FocusEvent as ReactFocusEvent,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  SyntheticEvent,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type MenuNavigationOptions = {
  itemCount: number;
  initialIndex?: number;
  orientation?: 'vertical' | 'horizontal';
  loop?: boolean;
  hoverDelay?: number;
  isItemDisabled?: (index: number) => boolean;
  onActiveChange?: (index: number) => void;
  onActivate?: (index: number, event: KeyboardEvent | React.KeyboardEvent) => void;
};

export type SetActiveIndexOptions = {
  focus?: boolean;
};

export type MoveActiveIndexOptions = {
  focus?: boolean;
};

export type UseMenuNavigationResult = {
  activeIndex: number;
  setActiveIndex: (index: number, options?: SetActiveIndexOptions) => void;
  moveActiveIndex: (delta: number, options?: MoveActiveIndexOptions) => void;
  registerItem: (index: number, node: HTMLElement | null) => void;
  getListProps: <T extends HTMLElement>(
    props?: React.HTMLAttributes<T>,
  ) => React.HTMLAttributes<T>;
  getItemProps: <T extends HTMLElement>(
    index: number,
    props?: React.HTMLAttributes<T>,
  ) => React.HTMLAttributes<T>;
};

const DEFAULT_HOVER_DELAY = 80;

const mergeHandlers = <E extends SyntheticEvent | KeyboardEvent>(
  userHandler: ((event: E) => void) | undefined,
  internalHandler: (event: E) => void,
) => {
  return (event: E) => {
    userHandler?.(event);
    if (!('defaultPrevented' in event) || !event.defaultPrevented) {
      internalHandler(event);
    }
  };
};

const clampIndex = (index: number, itemCount: number) => {
  if (itemCount <= 0) return -1;
  if (index < 0) return 0;
  if (index >= itemCount) return itemCount - 1;
  return index;
};

export function useMenuNavigation(options: MenuNavigationOptions): UseMenuNavigationResult {
  const {
    itemCount,
    initialIndex,
    orientation = 'vertical',
    loop = true,
    hoverDelay = DEFAULT_HOVER_DELAY,
    isItemDisabled,
    onActiveChange,
    onActivate,
  } = options;

  const disabledLookup = useCallback(
    (index: number) => (isItemDisabled ? Boolean(isItemDisabled(index)) : false),
    [isItemDisabled],
  );

  const resolveInitialIndex = useCallback(() => {
    if (itemCount <= 0) {
      return -1;
    }

    if (typeof initialIndex === 'number') {
      const next = clampIndex(initialIndex, itemCount);
      if (!disabledLookup(next)) {
        return next;
      }
    }

    for (let index = 0; index < itemCount; index += 1) {
      if (!disabledLookup(index)) {
        return index;
      }
    }
    return -1;
  }, [disabledLookup, initialIndex, itemCount]);

  const [activeIndex, setActiveIndexState] = useState<number>(() => resolveInitialIndex());
  const itemsRef = useRef<Array<HTMLElement | null>>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFocusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndexState((current) => {
      if (itemCount <= 0) {
        return -1;
      }
      if (current < 0 || current >= itemCount || disabledLookup(current)) {
        const next = resolveInitialIndex();
        if (next !== current) {
          if (next >= 0) {
            pendingFocusIndexRef.current = null;
            onActiveChange?.(next);
          }
          return next;
        }
      }
      return current;
    });
  }, [disabledLookup, itemCount, onActiveChange, resolveInitialIndex]);

  useEffect(() => {
    if (pendingFocusIndexRef.current == null) {
      return;
    }
    const node = itemsRef.current[pendingFocusIndexRef.current];
    if (node && typeof node.focus === 'function') {
      node.focus();
    }
    pendingFocusIndexRef.current = null;
  }, [activeIndex]);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    },
    [],
  );

  const scheduleFocus = useCallback((index: number, shouldFocus?: boolean) => {
    if (shouldFocus) {
      pendingFocusIndexRef.current = index;
    }
  }, []);

  const internalSetActiveIndex = useCallback(
    (index: number, options?: SetActiveIndexOptions) => {
      setActiveIndexState((current) => {
        if (itemCount <= 0) {
          return -1;
        }
        const candidate = clampIndex(index, itemCount);
        if (candidate === current) {
          return current;
        }
        if (disabledLookup(candidate)) {
          return current;
        }
        scheduleFocus(candidate, options?.focus);
        onActiveChange?.(candidate);
        return candidate;
      });
    },
    [disabledLookup, itemCount, onActiveChange, scheduleFocus],
  );

  const moveActiveIndex = useCallback(
    (delta: number, options?: MoveActiveIndexOptions) => {
      if (!delta || itemCount <= 0) {
        return;
      }
      setActiveIndexState((current) => {
        if (itemCount <= 0) {
          return -1;
        }

        let steps = 0;
        let next = current;
        let cursor = current;

        if (cursor < 0) {
          cursor = delta > 0 ? -1 : itemCount;
        }

        while (steps < itemCount) {
          next = cursor + (delta > 0 ? 1 : -1);
          if (loop) {
            next = (next + itemCount) % itemCount;
          } else {
            next = clampIndex(next, itemCount);
          }

          if (!disabledLookup(next)) {
            break;
          }

          cursor = next;
          steps += 1;
        }

        if (next === current || disabledLookup(next)) {
          return current;
        }

        scheduleFocus(next, options?.focus);
        onActiveChange?.(next);
        return next;
      });
    },
    [disabledLookup, itemCount, loop, onActiveChange, scheduleFocus],
  );

  const registerItem = useCallback((index: number, node: HTMLElement | null) => {
    itemsRef.current[index] = node;
  }, []);

  const getListProps = useCallback<UseMenuNavigationResult['getListProps']>(
    (props = {}) => {
      const { onKeyDown, role, tabIndex, ...rest } = props as HTMLAttributes<HTMLElement>;
      const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
        if (orientation === 'vertical') {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveActiveIndex(1, { focus: true });
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveActiveIndex(-1, { focus: true });
            return;
          }
        } else {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveActiveIndex(1, { focus: true });
            return;
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveActiveIndex(-1, { focus: true });
            return;
          }
        }
        if (event.key === 'Home') {
          event.preventDefault();
          internalSetActiveIndex(0, { focus: true });
          return;
        }
        if (event.key === 'End') {
          event.preventDefault();
          internalSetActiveIndex(itemCount - 1, { focus: true });
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          if (onActivate && activeIndex >= 0) {
            event.preventDefault();
            onActivate(activeIndex, event);
          }
        }
      };

      return {
        role: role ?? 'menu',
        tabIndex: typeof tabIndex === 'number' ? tabIndex : 0,
        'data-menu-list': rest['data-menu-list'] ?? 'true',
        ...rest,
        onKeyDown: mergeHandlers(onKeyDown, handleKeyDown),
      } as HTMLAttributes<HTMLElement>;
    },
    [activeIndex, internalSetActiveIndex, itemCount, moveActiveIndex, onActivate, orientation],
  );

  const getItemProps = useCallback<UseMenuNavigationResult['getItemProps']>(
    (index, props = {}) => {
      const { onMouseEnter, onMouseLeave, onFocus, className, role, ...rest } = props as HTMLAttributes<HTMLElement> & {
        className?: string;
      };

      const disabled = disabledLookup(index);
      const mergedClassName = ['menu-item', className].filter(Boolean).join(' ');

      const handleMouseEnter = (event: ReactMouseEvent<HTMLElement>) => {
        if (disabled) return;
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
        }
        if (hoverDelay <= 0) {
          internalSetActiveIndex(index);
          return;
        }
        hoverTimerRef.current = setTimeout(() => {
          internalSetActiveIndex(index);
        }, hoverDelay);
      };

      const handleMouseLeave = () => {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
      };

      const handleFocus = (event: ReactFocusEvent<HTMLElement>) => {
        if (!disabled) {
          internalSetActiveIndex(index);
        }
      };

      return {
        role: role ?? 'menuitem',
        'data-menu-item': 'true',
        'data-state': activeIndex === index ? 'active' : 'inactive',
        'data-disabled': disabled ? 'true' : undefined,
        className: mergedClassName,
        ...rest,
        onMouseEnter: mergeHandlers(onMouseEnter, handleMouseEnter),
        onMouseLeave: mergeHandlers(onMouseLeave, handleMouseLeave),
        onFocus: mergeHandlers(onFocus, handleFocus),
      } as HTMLAttributes<HTMLElement>;
    },
    [activeIndex, disabledLookup, hoverDelay, internalSetActiveIndex],
  );

  return useMemo(
    () => ({
      activeIndex,
      setActiveIndex: internalSetActiveIndex,
      moveActiveIndex,
      registerItem,
      getListProps,
      getItemProps,
    }),
    [activeIndex, getItemProps, getListProps, internalSetActiveIndex, moveActiveIndex, registerItem],
  );
}
