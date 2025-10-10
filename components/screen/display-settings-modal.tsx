"use client";

import React, { useEffect, useId } from "react";
import { ACCENT_OPTIONS, useSettings } from "../../hooks/useSettings";

const WALLPAPER_OPTIONS = [
  { value: "wall-1", label: "Wallpaper 1" },
  { value: "wall-2", label: "Wallpaper 2" },
  { value: "wall-3", label: "Wallpaper 3" },
  { value: "wall-4", label: "Wallpaper 4" },
  { value: "wall-5", label: "Wallpaper 5" },
  { value: "wall-6", label: "Wallpaper 6" },
  { value: "wall-7", label: "Wallpaper 7" },
  { value: "wall-8", label: "Wallpaper 8" },
];

const FONT_SCALE_MIN = 0.9;
const FONT_SCALE_MAX = 1.2;

interface DisplaySettingsModalProps {
  onClose: () => void;
}

const DisplaySettingsModal: React.FC<DisplaySettingsModalProps> = ({ onClose }) => {
  const {
    wallpaper,
    setWallpaper,
    useKaliWallpaper,
    setUseKaliWallpaper,
    density,
    setDensity,
    fontScale,
    setFontScale,
    accent,
    setAccent,
  } = useSettings();

  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      <div
        className="absolute inset-0 bg-black bg-opacity-60"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-11/12 max-w-2xl rounded-lg bg-ub-cool-grey text-white shadow-xl border border-gray-900"
      >
        <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold">
            Display Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Display Settings"
            className="rounded border border-transparent px-2 py-1 text-sm hover:bg-ub-warm-grey hover:bg-opacity-20"
          >
            Close
          </button>
        </header>
        <div className="space-y-6 px-6 py-6 text-sm">
          <section>
            <h3 className="text-base font-medium mb-3">Wallpaper</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useKaliWallpaper}
                  onChange={(event) => setUseKaliWallpaper(event.target.checked)}
                />
                <span>Use dynamic Kali wallpaper</span>
              </label>
              <label className="flex flex-col space-y-2">
                <span className="text-xs uppercase tracking-wide text-gray-300">Select image</span>
                <select
                  className="rounded border border-gray-800 bg-black bg-opacity-30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ubt-gedit-orange"
                  value={wallpaper}
                  onChange={(event) => setWallpaper(event.target.value)}
                  disabled={useKaliWallpaper}
                  aria-disabled={useKaliWallpaper}
                >
                  {WALLPAPER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-base font-medium mb-3">Interface density</h3>
            <div className="flex space-x-4" role="radiogroup" aria-label="Interface density">
              {[
                { value: "regular", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ].map((option) => (
                <label key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="density"
                    value={option.value}
                    checked={density === option.value}
                    onChange={() => setDensity(option.value as "regular" | "compact")}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-base font-medium mb-3">Font size</h3>
            <label className="flex items-center space-x-4">
              <span className="text-xs uppercase tracking-wide text-gray-300">Small</span>
              <input
                type="range"
                min={FONT_SCALE_MIN}
                max={FONT_SCALE_MAX}
                step={0.05}
                value={fontScale}
                onChange={(event) => setFontScale(parseFloat(event.target.value))}
                className="flex-1"
              />
              <span className="text-xs uppercase tracking-wide text-gray-300">Large</span>
            </label>
            <p className="mt-2 text-xs text-gray-300">Current scale: {fontScale.toFixed(2)}x</p>
          </section>

          <section>
            <h3 className="text-base font-medium mb-3">Accent color</h3>
            <div className="flex flex-wrap gap-3">
              {ACCENT_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccent(color)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    accent === color ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Use ${color} accent`}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DisplaySettingsModal;
