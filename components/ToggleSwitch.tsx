"use client";
import React from "react";

const DRAG_THRESHOLD_PX = 6;
const DRAG_THRESHOLD_SQUARED = DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  ariaLabel: string;
  onLabel?: string;
  offLabel?: string;
}

export default function ToggleSwitch({
  checked,
  onChange,
  className = "",
  ariaLabel,
  onLabel,
  offLabel,
}: ToggleSwitchProps) {
  const pointerStateRef = React.useRef<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const shouldToggleRef = React.useRef(false);
  const suppressClickRef = React.useRef(false);

  const resetPointerTracking = React.useCallback(
    (target: HTMLButtonElement | null, pointerId?: number) => {
      if (pointerId !== undefined && target) {
        try {
          if (target.hasPointerCapture(pointerId)) {
            target.releasePointerCapture(pointerId);
          }
        } catch {
          // Ignore browsers that do not support pointer capture for this target.
        }
      }
      pointerStateRef.current = null;
      shouldToggleRef.current = false;
    },
    [],
  );

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      pointerStateRef.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      shouldToggleRef.current = true;
      suppressClickRef.current = false;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore browsers that do not support pointer capture for this target.
      }
    },
    [],
  );

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const state = pointerStateRef.current;
    if (!state || state.id !== event.pointerId || !shouldToggleRef.current) {
      return;
    }

    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (dx * dx + dy * dy > DRAG_THRESHOLD_SQUARED) {
      shouldToggleRef.current = false;
    }
  }, []);

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = pointerStateRef.current;
      if (!state || state.id !== event.pointerId) {
        return;
      }

      const target = event.currentTarget;
      const allowToggle = shouldToggleRef.current;
      resetPointerTracking(target, event.pointerId);

      suppressClickRef.current = true;

      if (allowToggle) {
        onChange(!checked);
      }
    },
    [checked, onChange, resetPointerTracking],
  );

  const handlePointerCancel = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = pointerStateRef.current;
      if (!state || state.id !== event.pointerId) {
        return;
      }

      resetPointerTracking(event.currentTarget, event.pointerId);
    },
    [resetPointerTracking],
  );

  const handleClick = React.useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    onChange(!checked);
  }, [checked, onChange]);

  const baseLabelClass = "text-[11px] uppercase tracking-wide transition-colors";
  const activeLabelClass = "text-white";
  const inactiveLabelClass = "text-ubt-grey";

  return (
    <span className="inline-flex items-center gap-2">
      {offLabel && (
        <span className={`${baseLabelClass} ${checked ? inactiveLabelClass : activeLabelClass}`}>
          {offLabel}
        </span>
      )}
      <button
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`relative inline-flex h-5 w-10 rounded-full transition-colors focus:outline-none ${
          checked ? "bg-ub-orange" : "bg-ubt-cool-grey"
        } ${className}`.trim()}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-ub-cool-grey transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      {onLabel && (
        <span className={`${baseLabelClass} ${checked ? activeLabelClass : inactiveLabelClass}`}>
          {onLabel}
        </span>
      )}
    </span>
  );
}
