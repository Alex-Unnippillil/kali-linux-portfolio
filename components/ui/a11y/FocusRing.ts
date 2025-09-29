import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type FocusRingContextValue = {
  isFocusVisible: boolean;
};

const FocusRingContext = createContext<FocusRingContextValue | undefined>(undefined);

const MODAL_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const POINTER_EVENTS = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart'] as const;

export type FocusRingProviderProps = {
  children: ReactNode;
};

export const FocusRingProvider = ({ children }: FocusRingProviderProps) => {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const hadKeyboardEvent = useRef(false);

  useEffect(() => {
    const root = typeof document !== 'undefined' ? document.body : null;
    if (root) {
      root.dataset.focusVisible = isFocusVisible ? 'true' : 'false';
    }
  }, [isFocusVisible]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.altKey || event.ctrlKey) return;
      hadKeyboardEvent.current = true;
      if (MODAL_KEYS.has(event.key) || event.key === ' ') {
        setIsFocusVisible(true);
      }
    };

    const handlePointerEvent = () => {
      hadKeyboardEvent.current = false;
      setIsFocusVisible(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hadKeyboardEvent.current = true;
      }
    };

    const handleFocus = () => {
      if (hadKeyboardEvent.current) {
        setIsFocusVisible(true);
      }
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    POINTER_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, handlePointerEvent, true);
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      POINTER_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, handlePointerEvent, true);
      });
    };
  }, []);

  const value = useMemo<FocusRingContextValue>(() => ({ isFocusVisible }), [isFocusVisible]);

  return <FocusRingContext.Provider value={value}>{children}</FocusRingContext.Provider>;
};

export const useFocusRing = () => {
  const context = useContext(FocusRingContext);
  if (!context) {
    throw new Error('useFocusRing must be used within a FocusRingProvider');
  }
  return context;
};
