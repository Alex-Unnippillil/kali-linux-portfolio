"use client";
import React, { forwardRef } from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  ariaLabel: string;
}

const ToggleSwitch = forwardRef<HTMLButtonElement, ToggleSwitchProps>(
  function ToggleSwitch({
    checked,
    onChange,
    className = "",
    ariaLabel,
  }, ref) {
    return (
      <button
        ref={ref}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none ${
          checked ? "bg-ub-orange" : "bg-ubt-cool-grey"
        } ${className}`.trim()}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-ub-cool-grey transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    );
  }
);

export default ToggleSwitch;
