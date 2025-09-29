"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  contrastRatio,
  makeAccessibleSurface,
  pickAccessibleTextColor,
  parseColor,
  shadeColor,
} from "../utils/color";

interface AccentPickerProps {
  value: string;
  options: string[];
  onChange: (color: string) => void;
  ariaLabel?: string;
  className?: string;
}

const DEFAULT_BACKGROUND = "#0f1317";
const DEFAULT_TEXT = "#f5f5f5";

const AccentPicker = ({
  value,
  options,
  onChange,
  ariaLabel = "Accent color picker",
  className,
}: AccentPickerProps) => {
  const [palette, setPalette] = useState({
    background: DEFAULT_BACKGROUND,
    text: DEFAULT_TEXT,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const computed = window.getComputedStyle(root);
    setPalette({
      background: parseColor(
        computed.getPropertyValue("--color-bg") || DEFAULT_BACKGROUND,
      ),
      text: parseColor(computed.getPropertyValue("--color-text") || DEFAULT_TEXT),
    });
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx("grid gap-3 sm:grid-cols-3", className)}
    >
      {options.map((color) => {
        const textColor = pickAccessibleTextColor(
          color,
          palette.text,
          palette.background,
        );
        const accessibleSurface = makeAccessibleSurface(
          color,
          palette.background,
          palette.text,
        );
        const contrast = contrastRatio(color, textColor);
        const ratioLabel = `${contrast.toFixed(1)}:1`;
        const isSelected = value === color;
        const selectionRing = shadeColor(color, -0.35);

        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(color)}
            aria-label={`Accent ${color} with ${ratioLabel} contrast`}
            className={clsx(
              "relative h-20 w-full rounded-lg border border-white/15 bg-transparent transition-transform",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]",
              isSelected ? "scale-[1.02]" : "hover:scale-[1.02]",
            )}
            style={{
              borderColor: isSelected ? selectionRing : "rgba(255,255,255,0.12)",
              boxShadow: isSelected ? `0 0 0 2px ${selectionRing}` : "none",
            }}
          >
            <span className="sr-only">{`Select accent ${color} (contrast ${ratioLabel})`}</span>
            <span className="flex h-full flex-col overflow-hidden rounded-md">
              <span
                className="flex flex-1 items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: color, color: textColor }}
              >
                Aa
              </span>
              <span
                className="flex items-center justify-between px-2 py-1 text-[10px] font-medium uppercase tracking-wide"
                style={{ backgroundColor: accessibleSurface, color: palette.text }}
              >
                <span>{color.toUpperCase()}</span>
                <span>{ratioLabel}</span>
              </span>
            </span>
            {isSelected && (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 text-xs font-semibold"
                style={{ color: textColor }}
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AccentPicker;
