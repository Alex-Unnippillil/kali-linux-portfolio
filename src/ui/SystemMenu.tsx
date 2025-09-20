'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';

import { useSettings } from '@/hooks/useSettings';

type PopoverHandle = HTMLElement & {
  showPopover?: () => void;
  hidePopover?: () => void;
  togglePopover?: () => void;
};

const DEFAULT_POSITION_STYLE: CSSProperties = {
  position: 'fixed',
  top: '3.5rem',
  right: '1.5rem',
  margin: 0,
  zIndex: 60,
};

const panelClasses =
  'system-menu-panel w-72 max-w-sm rounded-md border border-black border-opacity-40 bg-ub-cool-grey p-4 text-sm text-white shadow-xl';
const groupTitleClasses = 'text-xs font-semibold uppercase tracking-wide text-ubt-grey';
const toggleRowClasses = 'flex items-center justify-between gap-4';

const SystemMenu: React.FC = () => {
  const idBase = useId();
  const menuId = `system-menu-${idBase}`;
  const headingId = `${menuId}-heading`;
  const displayGroupId = `${menuId}-display`;
  const accessibilityGroupId = `${menuId}-accessibility`;
  const interactionGroupId = `${menuId}-interaction`;
  const fallbackMenuId = `${menuId}-fallback`;
  const fallbackHeadingId = `${fallbackMenuId}-heading`;
  const fallbackDisplayGroupId = `${fallbackMenuId}-display`;
  const fallbackAccessibilityGroupId = `${fallbackMenuId}-accessibility`;
  const fallbackInteractionGroupId = `${fallbackMenuId}-interaction`;

  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<PopoverHandle | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);

  const [supportsPopover, setSupportsPopover] = useState<boolean | null>(() => {
    if (typeof window === 'undefined' || typeof HTMLElement === 'undefined') {
      return null;
    }
    return (
      typeof (HTMLElement.prototype as any).togglePopover === 'function' ||
      typeof (HTMLElement.prototype as any).showPopover === 'function'
    );
  });
  const [supportsDialog, setSupportsDialog] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null;
    return 'HTMLDialogElement' in window;
  });
  const [open, setOpen] = useState(false);
  const [anchorStyle, setAnchorStyle] = useState<CSSProperties>(DEFAULT_POSITION_STYLE);

  const {
    density,
    setDensity,
    reducedMotion,
    setReducedMotion,
    highContrast,
    setHighContrast,
    largeHitAreas,
    setLargeHitAreas,
    allowNetwork,
    setAllowNetwork,
    haptics,
    setHaptics,
  } = useSettings();

  useEffect(() => {
    if (supportsPopover !== null) return;
    if (typeof window === 'undefined' || typeof HTMLElement === 'undefined') return;
    const hasSupport =
      typeof (HTMLElement.prototype as any).togglePopover === 'function' ||
      typeof (HTMLElement.prototype as any).showPopover === 'function';
    setSupportsPopover(hasSupport);
  }, [supportsPopover]);

  useEffect(() => {
    if (supportsDialog !== null) return;
    if (typeof window === 'undefined') return;
    setSupportsDialog('HTMLDialogElement' in window);
  }, [supportsDialog]);

  useEffect(() => {
    if (!supportsPopover) return;
    setOpen(false);
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [supportsPopover]);

  const closeMenu = useCallback(() => {
    if (supportsPopover && popoverRef.current) {
      const popover = popoverRef.current;
      if (typeof popover.hidePopover === 'function') {
        try {
          popover.hidePopover();
        } catch {
          /* ignore */
        }
      }
    }
    if (!supportsPopover && supportsDialog && dialogRef.current?.open) {
      dialogRef.current.close();
    }
    setOpen(false);
  }, [supportsPopover, supportsDialog]);

  const handleToggle = () => {
    let popoverAvailable = supportsPopover;
    if (popoverAvailable === null) {
      const hasSupport =
        typeof window !== 'undefined' &&
        typeof HTMLElement !== 'undefined' &&
        (typeof (HTMLElement.prototype as any).togglePopover === 'function' ||
          typeof (HTMLElement.prototype as any).showPopover === 'function');
      popoverAvailable = hasSupport;
      setSupportsPopover(hasSupport);
      if (hasSupport) {
        return;
      }
    }

    if (popoverAvailable) {
      return;
    }

    let dialogAvailable = supportsDialog;
    if (dialogAvailable === null) {
      dialogAvailable = typeof window !== 'undefined' && 'HTMLDialogElement' in window;
      setSupportsDialog(dialogAvailable);
    }

    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (supportsPopover || !open) {
      if (!open) {
        setAnchorStyle(DEFAULT_POSITION_STYLE);
      }
      return;
    }

    const updatePosition = () => {
      const trigger = toggleRef.current;
      if (!trigger || typeof window === 'undefined') return;

      const rect = trigger.getBoundingClientRect();
      const top = Math.min(Math.max(rect.bottom + 8, 16), window.innerHeight - 16);
      const right = Math.max(window.innerWidth - rect.right, 16);

      setAnchorStyle({
        position: 'fixed',
        top: `${top}px`,
        right: `${right}px`,
        margin: 0,
        zIndex: 60,
      });
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, supportsPopover]);

  useEffect(() => {
    if (supportsPopover || !supportsDialog) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        /* ignore */
      }
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, supportsPopover, supportsDialog]);

  useEffect(() => {
    if (supportsPopover || !supportsDialog) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      dialog.close();
    };

    const handleClose = () => {
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    };

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) {
        dialog.close();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleBackdropClick);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [supportsPopover, supportsDialog]);

  useEffect(() => {
    if (supportsPopover || supportsDialog || !open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        toggleRef.current?.focus({ preventScroll: true });
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const menuNode = fallbackRef.current;
      const trigger = toggleRef.current;
      if (!menuNode) return;
      const target = event.target as Node;
      if (menuNode.contains(target) || (trigger && trigger.contains(target))) {
        return;
      }
      closeMenu();
      toggleRef.current?.focus({ preventScroll: true });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, supportsPopover, supportsDialog, closeMenu]);

  const isPopoverSupported = supportsPopover === true;
  const isDialogSupported = !isPopoverSupported && supportsDialog === true;

  const buttonDynamicProps: Record<string, unknown> = {
    popovertarget: menuId,
    popovertargetaction: 'toggle',
  };

  if (!isPopoverSupported) {
    buttonDynamicProps.onClick = handleToggle;
    buttonDynamicProps['aria-expanded'] = open;
  }

  const renderMenuContent = (
    titleId: string,
    displayId: string,
    interactionId: string,
    layoutId: string,
  ) => {
    const contrastId = `${titleId}-contrast`;
    const motionId = `${titleId}-motion`;
    const hitAreasId = `${titleId}-hit-areas`;
    const hapticsId = `${titleId}-haptics`;
    const networkId = `${titleId}-network`;

    return (
      <div className="flex flex-col gap-4 text-left">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-sm font-semibold text-white">
            System quick settings
          </h2>
          <p className="text-xs text-ubt-grey">
            Adjust desktop behaviour without leaving the portfolio window.
          </p>
        </div>

        <div role="group" aria-labelledby={displayId} className="space-y-2">
          <p id={displayId} className={groupTitleClasses}>
            Display
          </p>
          <div className={toggleRowClasses}>
            <label htmlFor={contrastId} className="cursor-pointer">
              High contrast
            </label>
            <input
              id={contrastId}
              type="checkbox"
              checked={highContrast}
              aria-label="High contrast"
              onChange={(event) => setHighContrast(event.target.checked)}
            />
          </div>
          <div className={toggleRowClasses}>
            <label htmlFor={motionId} className="cursor-pointer">
              Reduced motion
            </label>
            <input
              id={motionId}
              type="checkbox"
              checked={reducedMotion}
              aria-label="Reduced motion"
              onChange={(event) => setReducedMotion(event.target.checked)}
            />
          </div>
          <div className={toggleRowClasses}>
            <label htmlFor={hitAreasId} className="cursor-pointer">
              Large hit areas
            </label>
            <input
              id={hitAreasId}
              type="checkbox"
              checked={largeHitAreas}
              aria-label="Large hit areas"
              onChange={(event) => setLargeHitAreas(event.target.checked)}
            />
          </div>
        </div>

        <div role="group" aria-labelledby={interactionId} className="space-y-2">
          <p id={interactionId} className={groupTitleClasses}>
            Interaction
          </p>
          <div className={toggleRowClasses}>
            <label htmlFor={hapticsId} className="cursor-pointer">
              Enable haptics
            </label>
            <input
              id={hapticsId}
              type="checkbox"
              checked={haptics}
              aria-label="Enable haptics"
              onChange={(event) => setHaptics(event.target.checked)}
            />
          </div>
          <div className={toggleRowClasses}>
            <label htmlFor={networkId} className="cursor-pointer">
              Allow network requests
            </label>
            <input
              id={networkId}
              type="checkbox"
              checked={allowNetwork}
              aria-label="Allow network requests"
              onChange={(event) => setAllowNetwork(event.target.checked)}
            />
          </div>
          <p className="text-xs text-ubt-grey">
            When disabled, simulated tools stay fully offline.
          </p>
        </div>

        <div role="group" aria-labelledby={layoutId} className="space-y-2">
          <p id={layoutId} className={groupTitleClasses}>
            Layout
          </p>
          <button
            type="button"
            onClick={() => setDensity(density === 'regular' ? 'compact' : 'regular')}
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-orange"
          >
            <span className="flex items-center justify-between">
              <span>Density</span>
              <span className="capitalize text-ubt-grey">{density}</span>
            </span>
            <span className="mt-1 block text-xs text-ubt-grey">
              Toggle between regular and compact spacing.
            </span>
          </button>
        </div>

        <div className="flex justify-end">
          <Link
            href="/apps/settings"
            onClick={closeMenu}
            className="text-xs font-medium text-ubt-grey transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-orange"
          >
            Open full settings
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="system-menu relative inline-flex flex-col items-end">
      <button
        type="button"
        ref={toggleRef}
        aria-haspopup="dialog"
        aria-controls={isPopoverSupported ? menuId : fallbackMenuId}
        aria-label="Open system menu"
        className="system-menu-trigger flex items-center gap-2 rounded-md border border-black border-opacity-40 bg-ub-cool-grey px-3 py-2 text-sm font-medium text-white shadow hover:bg-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-orange"
        {...buttonDynamicProps}
      >
        <span>System</span>
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M2 2.5L6 6L10 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        id={menuId}
        ref={popoverRef}
        {...({ popover: 'auto' } as Record<string, unknown>)}
        role="dialog"
        aria-labelledby={headingId}
        className={`${panelClasses} mt-2`}
        style={DEFAULT_POSITION_STYLE}
        hidden={!isPopoverSupported}
      >
        {renderMenuContent(headingId, displayGroupId, accessibilityGroupId, interactionGroupId)}
      </div>

      {isPopoverSupported ? null : isDialogSupported ? (
        <dialog
          id={fallbackMenuId}
          ref={dialogRef}
          aria-labelledby={fallbackHeadingId}
          className={`${panelClasses} m-0`}
          style={anchorStyle}
        >
          {renderMenuContent(
            fallbackHeadingId,
            fallbackDisplayGroupId,
            fallbackAccessibilityGroupId,
            fallbackInteractionGroupId,
          )}
        </dialog>
      ) : (
        <div
          id={fallbackMenuId}
          ref={fallbackRef}
          role="dialog"
          aria-labelledby={fallbackHeadingId}
          className={panelClasses}
          hidden={!open}
          style={open ? anchorStyle : DEFAULT_POSITION_STYLE}
        >
          {renderMenuContent(
            fallbackHeadingId,
            fallbackDisplayGroupId,
            fallbackAccessibilityGroupId,
            fallbackInteractionGroupId,
          )}
        </div>
      )}
    </div>
  );
};

export default SystemMenu;
