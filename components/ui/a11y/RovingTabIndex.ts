import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

type RovingItem = {
  id: string;
  ref: MutableRefObject<HTMLElement | null>;
  disabled?: boolean;
};

type RegisterOptions = {
  disabled?: boolean;
};

type RovingTabIndexContextValue = {
  orientation: RovingOrientation;
  loop: boolean;
  activeId: string | null;
  registerItem: (id: string, node: HTMLElement | null, options?: RegisterOptions) => void;
  setActiveId: (id: string | null) => void;
  moveFocus: (currentId: string | null, direction: 'next' | 'prev' | 'first' | 'last') => void;
};

export type RovingTabIndexProviderProps = {
  children: ReactNode;
  orientation?: RovingOrientation;
  loop?: boolean;
  defaultActiveId?: string | null;
};

const RovingTabIndexContext = createContext<RovingTabIndexContextValue | undefined>(undefined);

export const RovingTabIndexProvider = ({
  children,
  orientation = 'horizontal',
  loop = false,
  defaultActiveId = null,
}: RovingTabIndexProviderProps) => {
  const items = useRef<Map<string, RovingItem>>(new Map());
  const order = useRef<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(defaultActiveId);

  const registerItem = useCallback(
    (id: string, node: HTMLElement | null, options?: RegisterOptions) => {
      const disabled = options?.disabled ?? false;
      if (node) {
        if (!items.current.has(id)) {
          order.current.push(id);
        }
        const ref: MutableRefObject<HTMLElement | null> = { current: node };
        items.current.set(id, { id, ref, disabled });
        if (activeId === null && !disabled) {
          setActiveId(id);
        }
      } else {
        items.current.delete(id);
        order.current = order.current.filter((existingId) => existingId !== id);
        if (activeId === id) {
          const firstAvailable = order.current
            .map((itemId) => items.current.get(itemId))
            .find((item): item is RovingItem => Boolean(item && !item.disabled));
          setActiveId(firstAvailable ? firstAvailable.id : null);
        }
      }
    },
    [activeId],
  );

  const focusItem = useCallback(
    (id: string | null) => {
      if (!id) return;
      const item = items.current.get(id);
      if (!item || item.disabled) return;
      const node = item.ref.current;
      if (node) {
        node.focus();
      }
      setActiveId(id);
    },
    [],
  );

  const moveFocus = useCallback(
    (currentId: string | null, direction: 'next' | 'prev' | 'first' | 'last') => {
      const enabledItems = order.current
        .map((itemId) => items.current.get(itemId))
        .filter((item): item is RovingItem => Boolean(item && !item.disabled));
      if (enabledItems.length === 0) return;

      const currentIndex = enabledItems.findIndex((item) => item.id === currentId);

      const lastIndex = enabledItems.length - 1;
      let targetIndex = currentIndex;

      if (direction === 'first') {
        targetIndex = 0;
      } else if (direction === 'last') {
        targetIndex = lastIndex;
      } else if (direction === 'next') {
        if (currentIndex < lastIndex) {
          targetIndex = currentIndex + 1;
        } else if (loop) {
          targetIndex = 0;
        }
      } else if (direction === 'prev') {
        if (currentIndex > 0) {
          targetIndex = currentIndex - 1;
        } else if (loop) {
          targetIndex = lastIndex;
        }
      }

      if (targetIndex < 0) targetIndex = 0;
      if (targetIndex > lastIndex) targetIndex = lastIndex;

      const target = enabledItems[targetIndex];
      if (target) {
        focusItem(target.id);
      }
    },
    [focusItem, loop],
  );

  const value = useMemo<RovingTabIndexContextValue>(
    () => ({ orientation, loop, activeId, registerItem, setActiveId, moveFocus }),
    [orientation, loop, activeId, registerItem, moveFocus],
  );

  return <RovingTabIndexContext.Provider value={value}>{children}</RovingTabIndexContext.Provider>;
};

type UseRovingTabIndexOptions = {
  id: string;
  disabled?: boolean;
};

type UseRovingTabIndexResult = {
  tabIndex: number;
  isActive: boolean;
  ref: (node: HTMLElement | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onFocus: () => void;
  focusSelf: () => void;
};

export const useRovingTabIndex = ({ id, disabled = false }: UseRovingTabIndexOptions): UseRovingTabIndexResult => {
  const context = useContext(RovingTabIndexContext);
  if (!context) {
    throw new Error('useRovingTabIndex must be used within a RovingTabIndexProvider');
  }

  const { orientation, activeId, registerItem, setActiveId, moveFocus } = context;
  const localRef = useRef<HTMLElement | null>(null);

  const setNode = useCallback(
    (node: HTMLElement | null) => {
      localRef.current = node;
      registerItem(id, node, { disabled });
    },
    [registerItem, id, disabled],
  );

  useEffect(() => {
    return () => {
      registerItem(id, null, { disabled });
    };
  }, [registerItem, id, disabled]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const key = event.key;
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';
      const isVertical = orientation === 'vertical' || orientation === 'both';

      if (key === 'Home') {
        event.preventDefault();
        moveFocus(id, 'first');
        return;
      }

      if (key === 'End') {
        event.preventDefault();
        moveFocus(id, 'last');
        return;
      }

      if (isHorizontal && (key === 'ArrowRight' || key === 'ArrowLeft')) {
        event.preventDefault();
        moveFocus(id, key === 'ArrowRight' ? 'next' : 'prev');
        return;
      }

      if (isVertical && (key === 'ArrowDown' || key === 'ArrowUp')) {
        event.preventDefault();
        moveFocus(id, key === 'ArrowDown' ? 'next' : 'prev');
      }
    },
    [orientation, moveFocus, id],
  );

  const handleFocus = useCallback(() => {
    if (!disabled) {
      setActiveId(id);
    }
  }, [setActiveId, id, disabled]);

  const focusSelf = useCallback(() => {
    const node = localRef.current;
    if (node) {
      node.focus();
    }
  }, []);

  return {
    tabIndex: activeId === id && !disabled ? 0 : -1,
    isActive: activeId === id,
    ref: setNode,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    focusSelf,
  };
};
