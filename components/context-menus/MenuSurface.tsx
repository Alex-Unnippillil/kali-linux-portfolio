import React, {
  ForwardedRef,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';

type MenuSurfaceProps = Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
  /** Controls visibility of the menu surface. */
  active: boolean;
  /** Called when the surface requests to close, e.g. via Escape. */
  onClose?: () => void;
  /** Orientation for keyboard navigation. */
  orientation?: 'horizontal' | 'vertical';
  /** Whether focus should be restored to the opener when the menu closes. */
  restoreFocus?: boolean;
};

const TYPEAHEAD_TIMEOUT = 500;

function setTabStops(items: HTMLElement[], focusIndex: number) {
  items.forEach((item, index) => {
    item.tabIndex = index === focusIndex ? 0 : -1;
  });
}

function getItemLabel(item: HTMLElement): string {
  const data = item.getAttribute('data-menu-label');
  if (data) return data.trim().toLowerCase();
  const aria = item.getAttribute('aria-label');
  if (aria) return aria.trim().toLowerCase();
  return (item.textContent ?? '').trim().toLowerCase();
}

function mergeRefs<T>(
  target: React.MutableRefObject<T | null>,
  forwarded?: ForwardedRef<T>
) {
  return (node: T | null) => {
    target.current = node;
    if (typeof forwarded === 'function') {
      forwarded(node);
    } else if (forwarded && typeof forwarded === 'object') {
      (forwarded as React.MutableRefObject<T | null>).current = node;
    }
  };
}

const MenuSurface = React.forwardRef<HTMLDivElement, MenuSurfaceProps>(
  (
    {
      active,
      children,
      className = '',
      onClose,
      orientation = 'vertical',
      restoreFocus = true,
      ...rest
    },
    forwardedRef
  ) => {
    const nodeRef = useRef<HTMLDivElement | null>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const itemsRef = useRef<HTMLElement[]>([]);
    const focusIndexRef = useRef(0);
    const typeaheadRef = useRef('');
    const typeaheadTimerRef = useRef<number | null>(null);

    useFocusTrap(nodeRef, active);

    const updateItems = useCallback(() => {
      const node = nodeRef.current;
      if (!node) {
        itemsRef.current = [];
        return itemsRef.current;
      }
      const selector = [
        '[role="menuitem"]',
        '[role="menuitemcheckbox"]',
        '[role="menuitemradio"]',
        '[role="option"]',
        '[role="tab"]'
      ]
        .map((value) => `${value}:not([aria-disabled="true"])`)
        .join(', ');
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(selector)
      ).filter((item) => !item.hasAttribute('disabled'));
      itemsRef.current = items;
      return items;
    }, []);

    const focusItem = useCallback(
      (index: number) => {
        const items = itemsRef.current;
        if (!items.length) return;
        const normalized = (index + items.length) % items.length;
        focusIndexRef.current = normalized;
        setTabStops(items, normalized);
        const target = items[normalized];
        target.focus();
      },
      []
    );

    const findMatch = useCallback(
      (search: string) => {
        const items = itemsRef.current;
        if (!items.length) return -1;
        const current = focusIndexRef.current ?? 0;
        const total = items.length;
        for (let offset = 0; offset < total; offset += 1) {
          const index = (current + offset) % total;
          const label = getItemLabel(items[index]);
          if (label && label.startsWith(search)) {
            return index;
          }
        }
        return -1;
      },
      []
    );

    const clearTypeahead = useCallback(() => {
      if (typeaheadTimerRef.current) {
        window.clearTimeout(typeaheadTimerRef.current);
        typeaheadTimerRef.current = null;
      }
      typeaheadRef.current = '';
    }, []);

    const handleTypeahead = useCallback(
      (key: string) => {
        const items = itemsRef.current;
        if (!items.length) return;

        const lower = key.toLowerCase();
        const nextBuffer = `${typeaheadRef.current}${lower}`;
        let match = findMatch(nextBuffer);
        let bufferToUse = nextBuffer;
        if (match === -1) {
          match = findMatch(lower);
          bufferToUse = lower;
        }
        if (match === -1) return;

        typeaheadRef.current = bufferToUse;
        if (typeaheadTimerRef.current) {
          window.clearTimeout(typeaheadTimerRef.current);
        }
        typeaheadTimerRef.current = window.setTimeout(() => {
          typeaheadRef.current = '';
          typeaheadTimerRef.current = null;
        }, TYPEAHEAD_TIMEOUT);
        focusItem(match);
      },
      [findMatch, focusItem]
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        const items = updateItems();
        if (!items.length) return;

        const key = event.key;
        const isHorizontal = orientation === 'horizontal';
        const forwardKeys = isHorizontal
          ? ['ArrowRight', 'ArrowDown']
          : ['ArrowDown'];
        const backwardKeys = isHorizontal
          ? ['ArrowLeft', 'ArrowUp']
          : ['ArrowUp'];

        if (forwardKeys.includes(key)) {
          event.preventDefault();
          focusItem(focusIndexRef.current + 1);
          clearTypeahead();
          return;
        }
        if (backwardKeys.includes(key)) {
          event.preventDefault();
          focusItem(focusIndexRef.current - 1);
          clearTypeahead();
          return;
        }
        if (key === 'Home') {
          event.preventDefault();
          focusItem(0);
          clearTypeahead();
          return;
        }
        if (key === 'End') {
          event.preventDefault();
          focusItem(items.length - 1);
          clearTypeahead();
          return;
        }
        if (key === 'Escape') {
          event.preventDefault();
          onClose?.();
          return;
        }

        if (
          key.length === 1 &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          handleTypeahead(key);
        }
      },
      [clearTypeahead, focusItem, handleTypeahead, onClose, orientation, updateItems]
    );

    useEffect(() => {
      const node = nodeRef.current;
      if (!node || !active) return undefined;

      const items = updateItems();
      if (!items.length) return undefined;
      focusIndexRef.current = 0;
      setTabStops(items, 0);
      const first = items[0];

      let frame: number | undefined;
      let timeout: number | undefined;

      const focusFirst = () => {
        first.focus();
      };

      if (typeof window.requestAnimationFrame === 'function') {
        frame = window.requestAnimationFrame(focusFirst);
      } else {
        timeout = window.setTimeout(focusFirst, 0);
      }

      return () => {
        if (typeof window.cancelAnimationFrame === 'function' && frame !== undefined) {
          window.cancelAnimationFrame(frame);
        }
        if (timeout !== undefined) {
          window.clearTimeout(timeout);
        }
      };
    }, [active, updateItems]);

    useEffect(() => {
      const node = nodeRef.current;
      if (!node || !active) return undefined;
      const keyHandler = (event: KeyboardEvent) => handleKeyDown(event);
      node.addEventListener('keydown', keyHandler);
      return () => {
        node.removeEventListener('keydown', keyHandler);
      };
    }, [active, handleKeyDown]);

    useEffect(() => {
      if (active) {
        const activeElement = document.activeElement as HTMLElement | null;
        previousFocusRef.current = activeElement;
      } else {
        clearTypeahead();
        if (!restoreFocus) return;
        const previous = previousFocusRef.current;
        previousFocusRef.current = null;
        if (
          previous &&
          typeof previous.focus === 'function' &&
          previous !== document.body &&
          !nodeRef.current?.contains(previous)
        ) {
          previous.focus();
        }
      }
      return undefined;
    }, [active, clearTypeahead, restoreFocus]);

    useEffect(
      () => () => {
        if (typeaheadTimerRef.current) {
          window.clearTimeout(typeaheadTimerRef.current);
        }
      },
      []
    );

    const visibilityClass = active ? 'block' : 'hidden';
    const combinedClassName = `${visibilityClass} ${className}`.trim();

    return (
      <div
        {...rest}
        ref={mergeRefs(nodeRef, forwardedRef)}
        role="menu"
        aria-hidden={!active}
        className={combinedClassName}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
          // Allow consumer-level handlers to run after internal logic.
          if (rest.onKeyDown) {
            rest.onKeyDown(event);
          }
        }}
      >
        {children}
      </div>
    );
  }
);

MenuSurface.displayName = 'MenuSurface';

export default MenuSurface;
