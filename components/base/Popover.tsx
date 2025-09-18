import React, { forwardRef, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export interface PopoverProps {
  /** Whether the popover should be rendered. */
  open: boolean;
  /** Anchor element used to ignore outside-click detection. */
  anchorRef?: React.RefObject<HTMLElement> | null;
  /** Called when the popover requests to close (outside click or Escape). */
  onClose?: () => void;
  /** ARIA role applied to the popover container. */
  role?: 'dialog' | 'menu' | 'listbox';
  /** Additional class names applied to the container. */
  className?: string;
  /** Optional inline style overrides. */
  style?: React.CSSProperties;
  /** Whether to focus the first focusable element when opening. */
  focusOnOpen?: boolean;
  /** Accessible label for assistive technology. */
  ariaLabel?: string;
  /** Id of an element that labels the popover. */
  ariaLabelledBy?: string;
  children: React.ReactNode;
}

function setRef<T>(target: React.Ref<T> | undefined, value: T) {
  if (!target) return;
  if (typeof target === 'function') {
    target(value);
    return;
  }
  try {
    // eslint-disable-next-line no-param-reassign
    (target as React.MutableRefObject<T>).current = value;
  } catch {
    // noop – the consumer provided a readonly ref
  }
}

const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(
  {
    open,
    anchorRef,
    onClose,
    role = 'dialog',
    className = '',
    style,
    focusOnOpen = true,
    ariaLabel,
    ariaLabelledBy,
    children,
  },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const node = localRef.current;
    if (!node) return;

    previousFocus.current = document.activeElement as HTMLElement | null;

    if (focusOnOpen) {
      const focusable = node.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
      (focusable || node).focus({ preventScroll: true });
    }

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!node.contains(target) && !anchorRef?.current?.contains(target)) {
        onClose?.();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handlePointer, true);
    document.addEventListener('touchstart', handlePointer, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handlePointer, true);
      document.removeEventListener('touchstart', handlePointer, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (focusOnOpen) {
        const focusTarget = previousFocus.current;
        if (focusTarget && typeof focusTarget.focus === 'function') {
          focusTarget.focus();
        }
        previousFocus.current = null;
      }
    };
  }, [open, onClose, anchorRef, focusOnOpen]);

  if (!open) {
    return null;
  }

  const classes = [
    'shadow-elevation-3',
    'rounded-md',
    'border',
    'border-black/40',
    'bg-ub-cool-grey',
    'focus:outline-none',
    className,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <div
      ref={(node) => {
        localRef.current = node;
        setRef(forwardedRef, node);
      }}
      role={role}
      aria-modal={role === 'dialog' ? true : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
      className={classes}
      style={style}
      data-elevation="popover"
    >
      {children}
    </div>
  );
});

Popover.displayName = 'Popover';

export default Popover;
