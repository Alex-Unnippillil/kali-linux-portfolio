"use client";
import React, { KeyboardEvent, useId } from "react";

interface ToggleSwitchProps {
  id?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  labelClassName?: string;
}

export default function ToggleSwitch({
  id,
  label,
  checked,
  onChange,
  className = "",
  labelClassName = "text-ubt-grey",
}: ToggleSwitchProps) {
  const generatedId = useId();
  const switchId = id ?? `${generatedId}-toggle`;
  const labelId = `${switchId}-label`;

  const handleToggle = () => {
    onChange(!checked);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Spacebar" || event.key === "Enter") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={["flex items-center gap-3", className].filter(Boolean).join(" ")}> 
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full p-2 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95 ${
          checked ? "bg-white/10" : "bg-white/5"
        }`}
      >
        <span
          className={`pointer-events-none relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200 ${
            checked ? "bg-ub-orange" : "bg-ubt-cool-grey"
          }`}
        >
          <span
            className={`absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-ub-cool-grey shadow transition-transform duration-200 ${
              checked ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </span>
      </button>
      <label
        id={labelId}
        htmlFor={switchId}
        className={["cursor-pointer select-none", labelClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </label>
    </div>
  );
}
