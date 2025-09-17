import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FocusEvent,
  HTMLAttributes,
  KeyboardEvent,
  MutableRefObject,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';

type ToolbarItemElement = ReactElement<Record<string, unknown>>;

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
}

const isElementDisabled = (element: ToolbarItemElement): boolean => {
  const props = element.props as Record<string, unknown> & {
    disabled?: boolean | string;
    'aria-disabled'?: boolean | string;
  };

  if (props.disabled === true) {
    return true;
  }

  if (typeof props.disabled === 'string' && props.disabled.length > 0) {
    if (props.disabled.toLowerCase() === 'true') {
      return true;
    }
  }

  const ariaDisabled = props['aria-disabled'];
  if (ariaDisabled === true) {
    return true;
  }

  if (typeof ariaDisabled === 'string' && ariaDisabled.length > 0) {
    return ariaDisabled.toLowerCase() === 'true';
  }

  return false;
};

const assignRef = <T,>(ref: Ref<T> | undefined, value: T) => {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  (ref as MutableRefObject<T | null>).current = value;
};

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  { children, orientation = 'horizontal', className, ...rest },
  forwardedRef,
) {
  const childArray = useMemo(() => Children.toArray(children), [children]);

  const focusableChildren = useMemo(() => {
    return childArray.filter((child): child is ToolbarItemElement =>
      isValidElement(child),
    );
  }, [childArray]);

  const enabledIndices = useMemo(() => {
    return focusableChildren.reduce<number[]>((indices, element, index) => {
      if (!isElementDisabled(element)) {
        indices.push(index);
      }

      return indices;
    }, []);
  }, [focusableChildren]);

  const [activeIndex, setActiveIndex] = useState<number>(() =>
    enabledIndices.length > 0 ? enabledIndices[0] : -1,
  );

  useEffect(() => {
    if (enabledIndices.length === 0) {
      if (activeIndex !== -1) {
        setActiveIndex(-1);
      }

      return;
    }

    if (!enabledIndices.includes(activeIndex)) {
      setActiveIndex(enabledIndices[0]);
    }
  }, [enabledIndices, activeIndex]);

  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  if (itemRefs.current.length !== focusableChildren.length) {
    itemRefs.current.length = focusableChildren.length;
  }

  const focusItem = useCallback((index: number) => {
    if (index < 0) {
      return;
    }

    const node = itemRefs.current[index];
    if (node && typeof node.focus === 'function') {
      node.focus();
    }
  }, []);

  const getNextEnabledIndex = useCallback(
    (currentIndex: number) => {
      if (enabledIndices.length === 0) {
        return -1;
      }

      if (currentIndex === -1) {
        return enabledIndices[0];
      }

      const position = enabledIndices.indexOf(currentIndex);
      if (position === -1) {
        return enabledIndices[0];
      }

      const nextPosition = (position + 1) % enabledIndices.length;
      return enabledIndices[nextPosition];
    },
    [enabledIndices],
  );

  const getPreviousEnabledIndex = useCallback(
    (currentIndex: number) => {
      if (enabledIndices.length === 0) {
        return -1;
      }

      if (currentIndex === -1) {
        return enabledIndices[enabledIndices.length - 1];
      }

      const position = enabledIndices.indexOf(currentIndex);
      if (position === -1) {
        return enabledIndices[enabledIndices.length - 1];
      }

      const previousPosition =
        (position - 1 + enabledIndices.length) % enabledIndices.length;

      return enabledIndices[previousPosition];
    },
    [enabledIndices],
  );

  const getFirstEnabledIndex = useCallback(() => {
    return enabledIndices.length > 0 ? enabledIndices[0] : -1;
  }, [enabledIndices]);

  const getLastEnabledIndex = useCallback(() => {
    return enabledIndices.length > 0
      ? enabledIndices[enabledIndices.length - 1]
      : -1;
  }, [enabledIndices]);

  const getTargetIndexForKey = useCallback(
    (eventKey: string, currentIndex: number) => {
      switch (eventKey) {
        case 'ArrowRight':
        case 'ArrowDown':
          return getNextEnabledIndex(currentIndex);
        case 'ArrowLeft':
        case 'ArrowUp':
          return getPreviousEnabledIndex(currentIndex);
        case 'Home':
          return getFirstEnabledIndex();
        case 'End':
          return getLastEnabledIndex();
        default:
          return null;
      }
    },
    [
      getNextEnabledIndex,
      getPreviousEnabledIndex,
      getFirstEnabledIndex,
      getLastEnabledIndex,
    ],
  );

  let focusableIndex = -1;
  const content = childArray.map((child) => {
    if (!isValidElement(child)) {
      return child;
    }

    focusableIndex += 1;
    const disabled = isElementDisabled(child as ToolbarItemElement);
    const isActive = !disabled && focusableIndex === activeIndex;

    const originalOnKeyDown = child.props
      .onKeyDown as ((event: KeyboardEvent<HTMLElement>) => void) | undefined;
    const originalOnFocus = child.props
      .onFocus as ((event: FocusEvent<HTMLElement>) => void) | undefined;

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      const targetIndex = getTargetIndexForKey(event.key, focusableIndex);
      if (targetIndex !== null) {
        event.preventDefault();

        if (targetIndex !== -1 && targetIndex !== focusableIndex) {
          setActiveIndex(targetIndex);
          focusItem(targetIndex);
        }
      }

      originalOnKeyDown?.(event);
    };

    const handleFocus = (event: FocusEvent<HTMLElement>) => {
      if (!disabled && activeIndex !== focusableIndex) {
        setActiveIndex(focusableIndex);
      }

      originalOnFocus?.(event);
    };

    const setRef = (node: HTMLElement | null) => {
      itemRefs.current[focusableIndex] = node;
      assignRef(child.ref, node);
    };

    const tabIndex = disabled ? -1 : isActive ? 0 : -1;

    return cloneElement(child, {
      ...child.props,
      tabIndex,
      onFocus: handleFocus,
      onKeyDown: handleKeyDown,
      ref: setRef,
    });
  });

  return (
    <div
      {...rest}
      ref={forwardedRef}
      role="toolbar"
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      className={className}
    >
      {content}
    </div>
  );
});

Toolbar.displayName = 'Toolbar';

export default Toolbar;

