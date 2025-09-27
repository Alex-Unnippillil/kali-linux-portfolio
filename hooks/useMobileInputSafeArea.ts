import { useCallback, useRef } from 'react';

type Cleanup = () => void;

type ScrollTarget = HTMLElement & {
  scrollIntoView: (options?: boolean | ScrollIntoViewOptions) => void;
};

const MOBILE_WIDTH = 900;

const isFocusableInput = (element: Element | null): element is ScrollTarget => {
  if (!element || !(element instanceof HTMLElement)) return false;
  if (element.hasAttribute('data-ignore-safe-area')) return false;

  const tagName = element.tagName;
  if (tagName === 'INPUT') {
    const type = element.getAttribute('type');
    if (type && ['hidden', 'range', 'checkbox', 'radio', 'file'].includes(type)) {
      return false;
    }
    return true;
  }

  return tagName === 'TEXTAREA' || tagName === 'SELECT' || element.isContentEditable;
};

const supportsCoarsePointer = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(pointer:coarse)').matches;
  } catch {
    return false;
  }
};

const getEnvFallback = () => {
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    if (CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)')) {
      return 'env(safe-area-inset-bottom, 0px)';
    }
  }
  return '0px';
};

/**
 * Adds keyboard-safe bottom padding for mobile form containers and
 * scrolls focused inputs into view when the on-screen keyboard appears.
 */
export const useMobileInputSafeArea = <T extends HTMLElement>() => {
  const cleanupRef = useRef<Cleanup>();
  const basePaddingRef = useRef<number>(0);
  const envFallback = getEnvFallback();

  const setRef = useCallback((node: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = undefined;

    if (
      !node ||
      typeof window === 'undefined' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }

    const viewport = window.visualViewport;
    const pointerCoarse = supportsCoarsePointer();
    const isMobileViewport = () => window.innerWidth <= MOBILE_WIDTH || (viewport ? viewport.width <= MOBILE_WIDTH : false);

    if (!pointerCoarse && !isMobileViewport()) {
      return;
    }

    const computedStyles = window.getComputedStyle(node);
    basePaddingRef.current = Number.parseFloat(computedStyles.paddingBottom || '0') || 0;

    const applyPadding = () => {
      if (!node) return;
      const keyboardOffset = viewport
        ? Math.max(0, Math.round(window.innerHeight - viewport.height))
        : 0;

      node.style.setProperty('--mobile-safe-area-bottom', `${keyboardOffset}px`);
      node.style.setProperty('--mobile-safe-base-padding', `${basePaddingRef.current}px`);
      const paddingExpression = `calc(var(--mobile-safe-base-padding, 0px) + var(--mobile-safe-area-bottom, 0px) + ${envFallback})`;
      node.style.paddingBottom = paddingExpression;
    };

    const schedulePadding = () => window.requestAnimationFrame(applyPadding);

    const handleFocus = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target || !node.contains(target) || !isFocusableInput(target)) {
        return;
      }

      schedulePadding();
      window.requestAnimationFrame(() => {
        const element = target as ScrollTarget;
        if (typeof element.scrollIntoView !== 'function') return;
        try {
          element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        } catch {
          element.scrollIntoView();
        }
      });
    };

    applyPadding();

    viewport?.addEventListener('resize', schedulePadding);
    viewport?.addEventListener('scroll', schedulePadding);
    window.addEventListener('resize', schedulePadding);
    window.addEventListener('orientationchange', schedulePadding);
    document.addEventListener('focusin', handleFocus, { passive: true });

    cleanupRef.current = () => {
      viewport?.removeEventListener('resize', schedulePadding);
      viewport?.removeEventListener('scroll', schedulePadding);
      window.removeEventListener('resize', schedulePadding);
      window.removeEventListener('orientationchange', schedulePadding);
      document.removeEventListener('focusin', handleFocus);
      if (node) {
        node.style.removeProperty('padding-bottom');
        node.style.removeProperty('--mobile-safe-area-bottom');
        node.style.removeProperty('--mobile-safe-base-padding');
      }
    };
  }, [envFallback]);

  return setRef;
};

export default useMobileInputSafeArea;
