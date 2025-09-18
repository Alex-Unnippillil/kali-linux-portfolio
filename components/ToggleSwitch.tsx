"use client";
import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  ariaLabel: string;
}

export default function ToggleSwitch({
  checked,
  onChange,
  className = "",
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none ${
        checked ? "bg-kali-primary" : "bg-kali-neutral-600"
      } ${className}`.trim()}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-kali-surface transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
