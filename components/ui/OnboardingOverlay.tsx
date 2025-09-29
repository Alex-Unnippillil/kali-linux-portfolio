"use client";

import {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent } from "react";
import usePersistentState from "../../hooks/usePersistentState";

const STORAGE_PREFIX = "onboarding:";

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

export interface OnboardingOverlayControls {
  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  dismissed: boolean;
  isOpen: boolean;
}

interface OnboardingOverlayProps {
  storageKey: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  trigger?: (controls: OnboardingOverlayControls) => ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissLabel?: string;
  align?: "center" | "end";
  disableBackdropClose?: boolean;
}

interface UseOnboardingProgress {
  dismissed: boolean;
  markComplete: () => void;
  reset: () => void;
}

export const useOnboardingProgress = (storageKey: string): UseOnboardingProgress => {
  const [dismissed, setDismissed] = usePersistentState<boolean>(
    `${STORAGE_PREFIX}${storageKey}`,
    false,
    isBoolean,
  );

  const markComplete = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  const reset = useCallback(() => {
    setDismissed(false);
  }, [setDismissed]);

  return { dismissed, markComplete, reset };
};

const alignmentClasses: Record<NonNullable<OnboardingOverlayProps["align"]>, string> = {
  center: "items-center justify-center",
  end: "items-start justify-end",
};

const focusSelectors =
  'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';

const OnboardingOverlay = ({
  storageKey,
  title,
  description,
  children,
  aside,
  footer,
  trigger,
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  dismissLabel = "Got it",
  align = "center",
  disableBackdropClose = false,
}: PropsWithChildren<OnboardingOverlayProps>) => {
  const { dismissed, markComplete, reset } = useOnboardingProgress(storageKey);
  const isControlled = typeof controlledOpen === "boolean";
  const [internalOpen, setInternalOpen] = useState<boolean>(
    () => !dismissed && defaultOpen,
  );
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const previousActive = useRef<HTMLElement | null>(null);
  const prevControlledOpen = useRef<boolean | undefined>(controlledOpen);

  useEffect(() => {
    if (isControlled) return;
    if (!dismissed && defaultOpen) {
      setInternalOpen(true);
    }
  }, [dismissed, defaultOpen, isControlled]);

  const setOpen = useCallback(
    (next: boolean, persistDismissal: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
      if (!next && persistDismissal) {
        markComplete();
      }
    },
    [isControlled, markComplete, onOpenChange],
  );

  const openOverlay = useCallback(() => {
    setOpen(true, false);
  }, [setOpen]);

  const closeOverlay = useCallback(() => {
    setOpen(false, true);
  }, [setOpen]);

  const resetAndShow = useCallback(() => {
    reset();
    setOpen(true, false);
  }, [reset, setOpen]);

  const isOpen = isControlled ? Boolean(controlledOpen) : internalOpen;

  useEffect(() => {
    if (!isControlled) return;
    if (prevControlledOpen.current && !controlledOpen) {
      markComplete();
    }
    prevControlledOpen.current = controlledOpen;
  }, [controlledOpen, isControlled, markComplete]);

  useEffect(() => {
    if (!isOpen) return;
    const node = overlayRef.current;
    if (!node) return;
    previousActive.current = document.activeElement as HTMLElement | null;
    const focusables = Array.from(node.querySelectorAll<HTMLElement>(focusSelectors));
    focusables[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlay();
        return;
      }
      if (event.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", handleKeyDown);
    return () => {
      node.removeEventListener("keydown", handleKeyDown);
      previousActive.current?.focus();
    };
  }, [closeOverlay, isOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isOpen || disableBackdropClose) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeOverlay, disableBackdropClose, isOpen]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (disableBackdropClose) return;
      if (event.target === event.currentTarget) {
        closeOverlay();
      }
    },
    [closeOverlay, disableBackdropClose],
  );

  const controls = useMemo<OnboardingOverlayControls>(
    () => ({
      open: openOverlay,
      close: closeOverlay,
      toggle: () => {
        if (isOpen) {
          closeOverlay();
        } else {
          openOverlay();
        }
      },
      reset: resetAndShow,
      dismissed,
      isOpen,
    }),
    [closeOverlay, dismissed, isOpen, openOverlay, resetAndShow],
  );

  const alignment = alignmentClasses[align] ?? alignmentClasses.center;

  return (
    <>
      {trigger?.(controls)}
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex ${alignment} p-4 bg-black/70 backdrop-blur-sm`}
          onClick={handleBackdropClick}
        >
          <div
            ref={overlayRef}
            className="relative w-full max-w-3xl rounded-lg border border-gray-700 bg-gray-900 text-gray-100 shadow-xl focus:outline-none"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={closeOverlay}
              className="absolute right-3 top-3 rounded-full bg-gray-800 px-3 py-1 text-sm font-medium text-gray-200 shadow focus:outline-none focus:ring"
            >
              ✕
            </button>
            <div className="flex flex-col gap-6 p-6 md:flex-row">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                {description && (
                  <p className="mt-2 text-sm text-gray-300">{description}</p>
                )}
                <div className="mt-4 space-y-4 text-sm text-gray-200">{children}</div>
              </div>
              {aside && (
                <aside className="w-full max-w-xs rounded-md border border-gray-700 bg-gray-800 p-4 text-sm text-gray-200">
                  {aside}
                </aside>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-800 bg-gray-900 px-6 py-4 text-sm md:flex-row md:items-center md:justify-between">
              <div className="text-gray-400">{footer}</div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetAndShow}
                  className="rounded border border-gray-600 px-3 py-1 text-gray-200 transition hover:border-gray-400 hover:text-white"
                >
                  Revisit intro
                </button>
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="rounded bg-ub-orange px-4 py-1 font-semibold text-black transition hover:bg-orange-400 focus:outline-none focus:ring"
                >
                  {dismissLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OnboardingOverlay;
