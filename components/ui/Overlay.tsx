import type { HTMLAttributes, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]'
].join(',');

const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'),
  );

export type OverlayVariant = 'center' | 'drawer-right' | 'drawer-left' | 'sheet-bottom';

const variantClasses: Record<OverlayVariant, string> = {
  center: 'items-center justify-center',
  'drawer-right': 'items-stretch justify-end',
  'drawer-left': 'items-stretch justify-start',
  'sheet-bottom': 'items-end justify-center',
};

export interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  variant?: OverlayVariant;
  closeOnBackdrop?: boolean;
  backdropClassName?: string;
  containerClassName?: string;
  initialFocusRef?: RefObject<HTMLElement> | null;
  returnFocusRef?: RefObject<HTMLElement> | null;
  overlayRoot?: string | HTMLElement | null;
}

const Overlay = ({
  open,
  onOpenChange,
  children,
  labelledBy,
  describedBy,
  role = 'dialog',
  className = '',
  backdropClassName = '',
  containerClassName = '',
  variant = 'center',
  closeOnBackdrop = true,
  initialFocusRef,
  returnFocusRef,
  overlayRoot,
  ...rest
}: OverlayProps) => {
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const inertRootRef = useRef<HTMLElement | null>(null);
  const inertRootAriaHidden = useRef<string | null>(null);
  const originalOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    setMounted(true);
    if (!portalRef.current) {
      const node = document.createElement('div');
      node.setAttribute('data-overlay-root', 'true');
      portalRef.current = node;
      document.body.appendChild(node);
    }
    return () => {
      if (portalRef.current && portalRef.current.parentNode) {
        portalRef.current.parentNode.removeChild(portalRef.current);
        portalRef.current = null;
      }
    };
  }, []);

  const resolveInertRoot = useCallback((): HTMLElement | null => {
    if (typeof document === 'undefined') {
      return null;
    }
    if (overlayRoot) {
      if (typeof overlayRoot === 'string') {
        return document.getElementById(overlayRoot);
      }
      return overlayRoot ?? null;
    }
    return document.getElementById('__next');
  }, [overlayRoot]);

  const focusInitialElement = useCallback(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }
    if (initialFocusRef?.current && node.contains(initialFocusRef.current)) {
      initialFocusRef.current.focus();
      return;
    }
    const focusable = getFocusableElements(node);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      node.focus();
    }
  }, [initialFocusRef]);

  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') {
      return;
    }
    const node = contentRef.current;
    if (!node) {
      return;
    }
    const focusable = getFocusableElements(node);
    if (focusable.length === 0) {
      event.preventDefault();
      node.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first || !node.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  const handleFocusIn = useCallback(
    (event: FocusEvent) => {
      const node = contentRef.current;
      if (!node) {
        return;
      }
      if (node.contains(event.target as Node)) {
        return;
      }
      focusInitialElement();
    },
    [focusInitialElement],
  );

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }
    const node = contentRef.current;
    if (!node) {
      return;
    }
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const inertRoot = resolveInertRoot();
    inertRootRef.current = inertRoot;
    if (inertRoot) {
      inertRootAriaHidden.current = inertRoot.getAttribute('aria-hidden');
      inertRoot.setAttribute('inert', '');
      inertRoot.setAttribute('aria-hidden', 'true');
    }
    if (typeof document !== 'undefined') {
      if (originalOverflowRef.current === null) {
        originalOverflowRef.current = document.body.style.overflow;
      }
      document.body.style.overflow = 'hidden';
    }

    const raf = window.requestAnimationFrame(() => {
      focusInitialElement();
    });

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onOpenChange) {
          event.preventDefault();
          onOpenChange(false);
        }
        return;
      }
      handleTabKey(event);
    };

    document.addEventListener('keydown', keyHandler);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('focusin', handleFocusIn);
      if (typeof document !== 'undefined' && originalOverflowRef.current !== null) {
        document.body.style.overflow = originalOverflowRef.current;
        originalOverflowRef.current = null;
      }
      if (inertRootRef.current) {
        if (inertRootAriaHidden.current === null) {
          inertRootRef.current.removeAttribute('aria-hidden');
        } else {
          inertRootRef.current.setAttribute('aria-hidden', inertRootAriaHidden.current);
        }
        inertRootRef.current.removeAttribute('inert');
        inertRootRef.current = null;
        inertRootAriaHidden.current = null;
      }
      const returnTarget = returnFocusRef?.current ?? previousFocusRef.current;
      if (returnTarget && typeof returnTarget.focus === 'function') {
        returnTarget.focus();
      }
    };
  }, [open, mounted, resolveInertRoot, focusInitialElement, handleFocusIn, handleTabKey, onOpenChange, returnFocusRef]);

  const handleBackdropClick = useCallback(() => {
    if (!closeOnBackdrop) {
      return;
    }
    onOpenChange?.(false);
  }, [closeOnBackdrop, onOpenChange]);

  const positionClasses = useMemo(() => variantClasses[variant] ?? variantClasses.center, [variant]);

  if (!open || !mounted || !portalRef.current) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${positionClasses} ${containerClassName}`.trim()}
      role="presentation"
    >
      <div
        className={`absolute inset-0 bg-black/60 ${backdropClassName}`.trim()}
        aria-hidden="true"
        onClick={handleBackdropClick}
      />
      <div
        {...rest}
        ref={contentRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative z-10 max-h-full overflow-auto focus:outline-none focus-visible:outline-none ${className}`.trim()}
        data-overlay-variant={variant}
      >
        {children}
      </div>
    </div>,
    portalRef.current,
  );
};

export default Overlay;
