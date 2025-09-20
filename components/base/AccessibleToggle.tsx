"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export interface AccessibleToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /**
   * Current checked state of the toggle.
   */
  checked: boolean;
  /**
   * Visible label rendered inside the button. Forms the accessible name.
   */
  label: string;
  /**
   * Optional supporting description announced via `aria-describedby`.
   */
  description?: string;
  /**
   * Optional status indicator rendered on the trailing edge.
   */
  statusLabel?: string;
  /**
   * Optional icon displayed at the leading edge of the control.
   */
  icon?: ReactNode;
  /**
   * Called with the next checked state when the control is toggled.
   */
  onToggle: (next: boolean) => void;
  /**
   * Optional long-press handler triggered after the interaction threshold.
   */
  onLongPress?: () => void;
}

const LONG_PRESS_DURATION = 550;

const baseClassName =
  "group relative flex flex-col justify-between gap-2 rounded-xl border border-black border-opacity-20 p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ub-orange";

export default function AccessibleToggle({
  checked,
  label,
  description,
  statusLabel,
  icon,
  onToggle,
  onLongPress,
  className = "",
  disabled,
  id,
  ...rest
}: AccessibleToggleProps) {
  const timerRef = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (!onLongPress) return;
    clearTimer();
    longPressTriggered.current = false;
    timerRef.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress();
    }, LONG_PRESS_DURATION);
  }, [clearTimer, onLongPress]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const handlePointerDown = useCallback<
    NonNullable<AccessibleToggleProps["onPointerDown"]>
  >(
    (event) => {
      if (disabled) return;
      if (event.button !== undefined && event.button !== 0) return;
      if (onLongPress) {
        startTimer();
      }
    },
    [disabled, onLongPress, startTimer],
  );

  const handlePointerUp = useCallback<
    NonNullable<AccessibleToggleProps["onPointerUp"]>
  >(() => {
    clearTimer();
  }, [clearTimer]);

  const handlePointerLeave = useCallback<
    NonNullable<AccessibleToggleProps["onPointerLeave"]>
  >(() => {
    clearTimer();
  }, [clearTimer]);

  const handleKeyDown = useCallback<
    NonNullable<AccessibleToggleProps["onKeyDown"]>
  >(
    (event) => {
      if (disabled) return;
      if (event.key !== " " && event.key !== "Enter") return;
      if (event.repeat) return;
      event.preventDefault();
      if (onLongPress) {
        startTimer();
      }
    },
    [disabled, onLongPress, startTimer],
  );

  const handleKeyUp = useCallback<
    NonNullable<AccessibleToggleProps["onKeyUp"]>
  >(
    (event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      clearTimer();
    },
    [clearTimer],
  );

  const handleClick = useCallback<
    NonNullable<ButtonHTMLAttributes<HTMLButtonElement>["onClick"]>
  >(
    (event) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      if (longPressTriggered.current) {
        event.preventDefault();
        event.stopPropagation();
        longPressTriggered.current = false;
        return;
      }
      onToggle(!checked);
    },
    [checked, disabled, onToggle],
  );

  const descriptionId = useMemo(() => {
    if (!description && !statusLabel) return undefined;
    return `${id ?? label.replace(/\s+/g, "-").toLowerCase()}-description`;
  }, [description, id, label, statusLabel]);

  const statusId = useMemo(() => {
    if (!statusLabel) return undefined;
    return `${id ?? label.replace(/\s+/g, "-").toLowerCase()}-status`;
  }, [id, label, statusLabel]);

  const ariaDescribedBy = useMemo(() => {
    if (descriptionId && statusId && description && statusLabel)
      return `${descriptionId} ${statusId}`;
    if (descriptionId && description) return descriptionId;
    if (statusId && statusLabel) return statusId;
    return undefined;
  }, [description, descriptionId, statusId, statusLabel]);

  const stateClasses = checked
    ? "bg-ub-orange text-white"
    : "bg-ub-cool-grey/80 text-ubt-grey hover:bg-ub-cool-grey";

  return (
    <button
      {...rest}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      className={`${baseClassName} ${stateClasses} ${className}`.trim()}
    >
      <span className="flex items-start justify-between gap-3">
        {icon ? (
          <span aria-hidden className="text-xl leading-none">
            {icon}
          </span>
        ) : null}
        <span className="flex-1 space-y-1">
          <span className="block text-sm font-semibold tracking-wide">
            {label}
          </span>
          {description ? (
            <span
              id={descriptionId}
              className="block text-xs text-ubt-grey text-opacity-80"
            >
              {description}
            </span>
          ) : null}
        </span>
        <span
          id={statusId}
          className="text-xs font-medium uppercase tracking-wide text-ubt-grey text-opacity-80"
        >
          {statusLabel ?? (checked ? "On" : "Off")}
        </span>
      </span>
    </button>
  );
}
