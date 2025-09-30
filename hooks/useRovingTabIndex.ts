import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type RovingOrientation = 'horizontal' | 'vertical' | 'grid';

export interface UseRovingTabIndexOptions {
  /** Number of focusable items that participate in the roving behaviour. */
  itemCount: number;
  /** Whether keyboard handling should be active. */
  enabled?: boolean;
  /** Starting index when the hook becomes active. */
  initialIndex?: number;
  /** Keyboard orientation. `grid` enables arrow navigation in two dimensions. */
  orientation?: RovingOrientation;
  /** Number of columns in the grid orientation. Defaults to 1. */
  columns?: number;
  /** If true, navigation wraps around the ends of the list. */
  wrap?: boolean;
  /**
   * Predicate that determines whether an item should be considered disabled.
   * Disabled items are skipped during navigation and receive tabIndex -1.
   */
  isItemDisabled?: (index: number) => boolean;
  /** Callback fired when the active index changes. */
  onActiveChange?: (index: number) => void;
}

export interface UseRovingTabIndexResult {
  /** Index of the currently focusable item, or -1 when none are available. */
  activeIndex: number;
  /** Imperative setter to move focus programmatically. */
  setActiveIndex: (index: number) => void;
  /**
   * Keydown handler that should be attached to the container element hosting
   * the focusable children.
   */
  onKeyDown: (event: React.KeyboardEvent) => void;
  /**
   * Returns the props that should be applied to a focusable item at `index`.
   * These props merge with the caller supplied props.
   */
  getItemProps: <T extends HTMLElement>(
    index: number,
    props?: React.HTMLAttributes<T>
  ) => React.HTMLAttributes<T>;
}

const DEFAULT_OPTIONS: Required<Omit<UseRovingTabIndexOptions, 'itemCount' | 'isItemDisabled' | 'onActiveChange'>> = {
  enabled: true,
  initialIndex: 0,
  orientation: 'horizontal',
  columns: 1,
  wrap: true,
};

/**
 * Manages the roving tab index pattern for composite widgets and grids.
 * Consumers supply the list length and receive helpers to wire up keyboard
 * navigation and `tabIndex` on the individual focusable elements.
 */
export default function useRovingTabIndex(
  options: UseRovingTabIndexOptions
): UseRovingTabIndexResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const {
    itemCount,
    enabled,
    initialIndex,
    orientation,
    columns,
    wrap,
    isItemDisabled,
    onActiveChange,
  } = opts;

  const columnCount = useMemo(() => {
    if (orientation !== 'grid') return 1;
    return Math.max(1, columns);
  }, [columns, orientation]);

  const isDisabled = useCallback(
    (index: number) => {
      if (typeof isItemDisabled === 'function') {
        return isItemDisabled(index);
      }
      return false;
    },
    [isItemDisabled]
  );

  const findFirstEnabled = useCallback(() => {
    for (let i = 0; i < itemCount; i += 1) {
      if (!isDisabled(i)) return i;
    }
    return -1;
  }, [isDisabled, itemCount]);

  const findLastEnabled = useCallback(() => {
    for (let i = itemCount - 1; i >= 0; i -= 1) {
      if (!isDisabled(i)) return i;
    }
    return -1;
  }, [isDisabled, itemCount]);

  const sanitizeIndex = useCallback(
    (candidate: number) => {
      if (itemCount === 0) return -1;
      if (candidate < 0 || candidate >= itemCount || isDisabled(candidate)) {
        const fallback = candidate <= 0 ? findFirstEnabled() : findLastEnabled();
        return fallback;
      }
      return candidate;
    },
    [findFirstEnabled, findLastEnabled, isDisabled, itemCount]
  );

  const [activeIndex, setActiveIndexState] = useState<number>(() => {
    if (!enabled || itemCount === 0) return -1;
    const initial = sanitizeIndex(Math.max(0, Math.min(initialIndex, itemCount - 1)));
    return initial;
  });

  useEffect(() => {
    if (!enabled) return;
    if (itemCount === 0) {
      if (activeIndex !== -1) setActiveIndexState(-1);
      return;
    }
    if (activeIndex === -1 || activeIndex >= itemCount || isDisabled(activeIndex)) {
      const fallback = sanitizeIndex(Math.max(0, Math.min(initialIndex, itemCount - 1)));
      setActiveIndexState(fallback);
      if (fallback !== -1) onActiveChange?.(fallback);
    }
  }, [activeIndex, enabled, initialIndex, isDisabled, itemCount, onActiveChange, sanitizeIndex]);

  const updateActiveIndex = useCallback(
    (nextIndex: number) => {
      setActiveIndexState((prev) => {
        if (nextIndex === prev) return prev;
        onActiveChange?.(nextIndex);
        return nextIndex;
      });
    },
    [onActiveChange]
  );

  const move = useCallback(
    (current: number, delta: number) => {
      if (itemCount === 0) return -1;
      if (current === -1) {
        return delta >= 0 ? findFirstEnabled() : findLastEnabled();
      }

      let candidate = current;
      for (let attempts = 0; attempts < itemCount; attempts += 1) {
        let next = candidate + delta;
        if (wrap) {
          next = ((next % itemCount) + itemCount) % itemCount;
        } else {
          if (next < 0) next = 0;
          if (next > itemCount - 1) next = itemCount - 1;
        }
        if (next === candidate) return current;
        candidate = next;
        if (!isDisabled(candidate)) return candidate;
      }
      return current;
    },
    [findFirstEnabled, findLastEnabled, isDisabled, itemCount, wrap]
  );

  const setActiveIndex = useCallback(
    (index: number) => {
      if (!enabled) return;
      if (index === -1) {
        updateActiveIndex(-1);
        return;
      }
      const sanitized = sanitizeIndex(index);
      if (sanitized !== -1) {
        updateActiveIndex(sanitized);
      }
    },
    [enabled, sanitizeIndex, updateActiveIndex]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || itemCount === 0) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const key = event.key;
      let nextIndex = activeIndex;
      let handled = false;

      if (key === 'ArrowRight' && orientation !== 'vertical') {
        nextIndex = move(activeIndex, 1);
        handled = true;
      } else if (key === 'ArrowLeft' && orientation !== 'vertical') {
        nextIndex = move(activeIndex, -1);
        handled = true;
      } else if (key === 'ArrowDown' && orientation !== 'horizontal') {
        const step = orientation === 'grid' ? columnCount : 1;
        nextIndex = move(activeIndex, step);
        handled = true;
      } else if (key === 'ArrowUp' && orientation !== 'horizontal') {
        const step = orientation === 'grid' ? -columnCount : -1;
        nextIndex = move(activeIndex, step);
        handled = true;
      } else if (key === 'Home') {
        const first = findFirstEnabled();
        if (first !== -1) nextIndex = first;
        handled = true;
      } else if (key === 'End') {
        const last = findLastEnabled();
        if (last !== -1) nextIndex = last;
        handled = true;
      }

      if (handled) {
        event.preventDefault();
        if (nextIndex !== -1) {
          setActiveIndex(nextIndex);
        }
      }
    },
    [
      activeIndex,
      columnCount,
      enabled,
      findFirstEnabled,
      findLastEnabled,
      itemCount,
      move,
      orientation,
      setActiveIndex,
    ]
  );

  const getItemProps = useCallback(
    <T extends HTMLElement>(
      index: number,
      props: React.HTMLAttributes<T> = {}
    ): React.HTMLAttributes<T> => {
      const disabled = isDisabled(index);
      const isActive = !disabled && index === activeIndex;

      const { onFocus, onMouseEnter, tabIndex, ...rest } = props;

      const merged: React.HTMLAttributes<T> = {
        ...rest,
        tabIndex: disabled ? -1 : tabIndex ?? (isActive ? 0 : -1),
        'data-roving-item': 'true',
        onFocus: (event) => {
          if (!disabled) {
            setActiveIndex(index);
          }
          onFocus?.(event);
        },
        onMouseEnter: (event) => {
          if (!disabled) {
            setActiveIndex(index);
          }
          onMouseEnter?.(event);
        },
      } as React.HTMLAttributes<T>;

      return merged;
    },
    [activeIndex, isDisabled, setActiveIndex]
  );

  return {
    activeIndex,
    setActiveIndex,
    onKeyDown: handleKeyDown,
    getItemProps,
  };
}
