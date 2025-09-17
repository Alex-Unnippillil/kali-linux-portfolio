"use client";

import type { FC } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  TOUR_STORAGE_KEY,
  createTourPersistence,
} from "./Tour";

interface HelpOverlayProps {
  onClose: () => void;
  onResetTour?: () => void;
  storageKey?: string;
}

const HelpOverlay: FC<HelpOverlayProps> = ({
  onClose,
  onResetTour,
  storageKey = TOUR_STORAGE_KEY,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const persistence = useMemo(
    () => createTourPersistence(storageKey),
    [storageKey],
  );

  useEffect(() => {
    const node = overlayRef.current;
    if (!node) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const selectors =
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(
      node.querySelectorAll<HTMLElement>(selectors),
    );
    focusables[0]?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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

    node.addEventListener("keydown", handleKey);

    return () => {
      node.removeEventListener("keydown", handleKey);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const handleReset = useCallback(() => {
    persistence.clear();
    onResetTour?.();
  }, [persistence, onResetTour]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-70 text-white flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-help-title"
    >
      <div className="max-w-lg w-full mx-4 bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-6">
        <h2 className="text-2xl font-semibold mb-4" id="system-help-title">
          Desktop Help
        </h2>
        <p className="mb-3 text-gray-200">
          The desktop tour introduces the dock, global shortcuts, and window
          controls. Once you finish the walkthrough it stays hidden so it never
          blocks returning visitors.
        </p>
        <p className="mb-6 text-sm text-gray-400">
          Completion is stored in your browser using localStorage. If you want
          to see the guided experience again or clear a shared machine, use the
          reset button below.
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            onClick={handleReset}
            disabled={!persistence.available}
          >
            Reset tour
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {!persistence.available && (
          <p className="mt-4 text-xs text-red-200" role="status">
            Reset is unavailable because localStorage could not be accessed in
            this environment.
          </p>
        )}
      </div>
    </div>
  );
};

export default HelpOverlay;
