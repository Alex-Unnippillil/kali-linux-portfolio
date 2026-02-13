"use client";
import React, { forwardRef, useId } from "react";

type LabelPosition = "left" | "right";

interface ToggleSwitchProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "checked" | "onChange" | "className"
  > {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  /**
   * Optional visible label that will be associated with the control.
   */
  label?: React.ReactNode;
  /**
   * Controls whether the label appears to the left or right of the switch.
   * Defaults to `right` to match the previous layout expectations.
   */
  labelPosition?: LabelPosition;
  /**
   * Allows styling the visible label when provided.
   */
  labelClassName?: string;
  /**
   * Backwards compatible alias for `aria-label`.
   */
  ariaLabel?: string;
}

const ToggleSwitch = forwardRef<HTMLInputElement, ToggleSwitchProps>(
  (
    {
      checked,
      onChange,
      className = "",
      label,
      labelPosition = "right",
      labelClassName = "",
      ariaLabel,
      id,
      name,
      value = "on",
      disabled,
      onKeyDown,
      ...inputProps
    },
    ref,
  ) => {
    const generatedId = useId();
    const controlId = id ?? generatedId;

    const labelMarkup = label ? (
      <span
        className={`select-none text-sm text-ubt-grey ${labelClassName}`.trim()}
      >
        {label}
      </span>
    ) : null;

    return (
      <label
        htmlFor={controlId}
        className={`inline-flex items-center gap-2 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        {labelPosition === "left" && labelMarkup}
        <span className="relative inline-flex items-center">
          <input
            ref={ref}
            id={controlId}
            name={name}
            type="checkbox"
            role="switch"
            value={value}
            className="peer sr-only"
            checked={checked}
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onChange(!checked);
              }
              onKeyDown?.(event);
            }}
            {...inputProps}
          />
          <span
            aria-hidden="true"
            className={`relative inline-flex h-5 w-10 rounded-full transition-colors duration-200 ${
              checked ? "bg-ub-orange" : "bg-ubt-cool-grey"
            } ${
              disabled ? "opacity-70" : ""
            } ${className} peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ub-orange`.trim()}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-ub-cool-grey transition-transform duration-200 ${
                checked ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </span>
        {labelPosition === "right" && labelMarkup}
      </label>
    );
  },
);

ToggleSwitch.displayName = "ToggleSwitch";

export default ToggleSwitch;
