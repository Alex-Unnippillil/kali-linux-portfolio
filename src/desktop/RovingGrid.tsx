'use client';

import React, {
  Children,
  ReactElement,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

export interface RovingGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional column count. When omitted the component will attempt to
   * determine the value based on the rendered items.
   */
  columns?: number;
  children: React.ReactNode;
}

const TOLERANCE_PX = 1;

function isHTMLElement(node: unknown): node is HTMLElement {
  return node instanceof HTMLElement;
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
  } else {
    try {
      (ref as React.MutableRefObject<T>).current = value;
    } catch (error) {
      // ignore refs that cannot be assigned
    }
  }
}

function isDisabled(node: HTMLElement | null): boolean {
  if (!node) return true;
  if ((node as HTMLButtonElement).disabled) return true;
  const ariaDisabled = node.getAttribute('aria-disabled');
  if (ariaDisabled === 'true') return true;
  const dataDisabled = node.getAttribute('data-disabled');
  return dataDisabled === 'true';
}

const RovingGrid: React.FC<RovingGridProps> = ({ columns: columnsProp, children, ...rest }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const activeIndexRef = useRef(0);

  const childArray = useMemo(
    () =>
      Children.toArray(children).filter((child): child is ReactElement<React.HTMLAttributes<HTMLElement>> =>
        isValidElement(child)
      ),
    [children]
  );

  const ensureActiveIndex = useCallback(
    (index: number, { focus = true }: { focus?: boolean } = {}) => {
      const nodes = itemRefs.current;
      if (!nodes.length) return;

      let target = Math.max(0, Math.min(index, nodes.length - 1));
      if (isDisabled(nodes[target])) {
        let forward = target + 1;
        let backward = target - 1;
        while (forward < nodes.length || backward >= 0) {
          if (forward < nodes.length && !isDisabled(nodes[forward])) {
            target = forward;
            break;
          }
          if (backward >= 0 && !isDisabled(nodes[backward])) {
            target = backward;
            break;
          }
          forward += 1;
          backward -= 1;
        }
      }

      const node = nodes[target];
      if (!node || isDisabled(node)) return;

      activeIndexRef.current = target;
      nodes.forEach((item, i) => {
        if (!item) return;
        item.tabIndex = i === target ? 0 : -1;
      });

      if (focus) {
        node.focus();
      }
    },
    []
  );

  const resolveColumns = useCallback(() => {
    if (columnsProp && columnsProp > 0) {
      return columnsProp;
    }

    const nodes = itemRefs.current.filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length <= 1) {
      return 1;
    }

    const firstTop = nodes[0].offsetTop;
    let columns = 0;
    for (const node of nodes) {
      if (Math.abs(node.offsetTop - firstTop) <= TOLERANCE_PX) {
        columns += 1;
      } else {
        break;
      }
    }

    if (columns > 0) {
      return columns;
    }

    return Math.max(1, Math.round(Math.sqrt(nodes.length)));
  }, [columnsProp]);

  useEffect(() => {
    if (itemRefs.current.length !== childArray.length) {
      itemRefs.current = childArray.map((_, index) => itemRefs.current[index] ?? null);
    }
    ensureActiveIndex(activeIndexRef.current, { focus: false });
  }, [childArray, ensureActiveIndex]);

  const handleItemFocus = useCallback(
    (index: number, event: React.FocusEvent<HTMLElement>, userHandler?: React.FocusEventHandler<HTMLElement>) => {
      if (typeof userHandler === 'function') {
        userHandler(event);
      }
      if (event.defaultPrevented) return;
      if (!isHTMLElement(event.currentTarget)) return;
      itemRefs.current[index] = event.currentTarget;
      ensureActiveIndex(index, { focus: false });
    },
    [ensureActiveIndex]
  );

  const handleItemKeyDown = useCallback(
    (
      index: number,
      event: React.KeyboardEvent<HTMLElement>,
      userHandler?: React.KeyboardEventHandler<HTMLElement>
    ) => {
      if (typeof userHandler === 'function') {
        userHandler(event);
      }
      if (event.defaultPrevented) return;

      const nodes = itemRefs.current;
      const total = nodes.length;
      if (!total) return;

      const columns = resolveColumns();
      let nextIndex = index;

      switch (event.key) {
        case 'ArrowRight': {
          const candidate = index + 1;
          if (candidate < total) {
            nextIndex = candidate;
          }
          break;
        }
        case 'ArrowLeft': {
          const candidate = index - 1;
          if (candidate >= 0) {
            nextIndex = candidate;
          }
          break;
        }
        case 'ArrowDown': {
          if (columns > 0) {
            const candidate = index + columns;
            if (candidate < total) {
              nextIndex = candidate;
            } else {
              const lastRowStart = Math.floor((total - 1) / columns) * columns;
              const offset = index % columns;
              const fallback = lastRowStart + offset;
              if (fallback < total) {
                nextIndex = fallback;
              } else {
                nextIndex = total - 1;
              }
            }
          }
          break;
        }
        case 'ArrowUp': {
          if (columns > 0) {
            const candidate = index - columns;
            if (candidate >= 0) {
              nextIndex = candidate;
            } else {
              const offset = index % columns;
              if (offset < total) {
                nextIndex = offset;
              }
            }
          }
          break;
        }
        default:
          return;
      }

      if (nextIndex !== index) {
        event.preventDefault();
        ensureActiveIndex(nextIndex);
      }
    },
    [ensureActiveIndex, resolveColumns]
  );

  const renderChildren = useMemo(() => {
    return childArray.map((child, index) => {
      const existingRef = (child as ReactElement & { ref?: React.Ref<HTMLElement> }).ref;
      const onFocus = child.props.onFocus as React.FocusEventHandler<HTMLElement> | undefined;
      const onKeyDown = child.props.onKeyDown as React.KeyboardEventHandler<HTMLElement> | undefined;

      const setItemRef = (node: HTMLElement | null) => {
        if (node && !isHTMLElement(node)) {
          itemRefs.current[index] = null;
          assignRef(existingRef, node as unknown as HTMLElement | null);
          return;
        }
        itemRefs.current[index] = node;
        assignRef(existingRef, node);
      };

      return cloneElement(child, {
        tabIndex: activeIndexRef.current === index ? 0 : -1,
        onFocus: (event: React.FocusEvent<HTMLElement>) => handleItemFocus(index, event, onFocus),
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => handleItemKeyDown(index, event, onKeyDown),
        ref: setItemRef,
      });
    });
  }, [childArray, handleItemFocus, handleItemKeyDown]);

  return (
    <div ref={containerRef} {...rest}>
      {renderChildren}
    </div>
  );
};

export default RovingGrid;
