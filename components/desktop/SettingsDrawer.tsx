"use client";

import { ChangeEvent } from "react";
import { useSettings, ACCENT_OPTIONS } from "../../hooks/useSettings";

type DensityOption = {
  value: "regular" | "compact";
  label: string;
  description: string;
};

const DENSITY_OPTIONS: DensityOption[] = [
  { value: "regular", label: "Comfortable", description: "Balanced spacing for desktop displays." },
  { value: "compact", label: "Compact", description: "Tighter spacing to fit more information." },
];

const SettingsDrawer = () => {
  const {
    density,
    setDensity,
    reducedMotion,
    setReducedMotion,
    largeHitAreas,
    setLargeHitAreas,
    fontScale,
    setFontScale,
    accent,
    setAccent,
  } = useSettings();

  const handleDensityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDensity(event.target.value as DensityOption["value"]);
  };

  const handleFontScaleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFontScale(parseFloat(event.target.value));
  };

  return (
    <div
      className="rounded-xl border border-white/10 bg-black/60 text-sm text-white/90 shadow-lg backdrop-blur"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4, 1rem)",
        padding: "var(--space-4, 1rem)",
        minWidth: "18rem",
      }}
      role="group"
      aria-label="desktop settings"
    >
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2, 0.5rem)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">Density</h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-2, 0.5rem)" }}
          role="radiogroup"
          aria-label="density"
        >
          {DENSITY_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer flex-col gap-1 rounded-lg border border-white/10 bg-white/5 p-2 hover:border-white/30">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="desktop-density"
                  value={option.value}
                  checked={density === option.value}
                  onChange={handleDensityChange}
                  aria-label={`${option.label} density`}
                />
                <span className="font-medium">{option.label}</span>
              </div>
              <p className="text-xs text-white/60">{option.description}</p>
            </label>
          ))}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2, 0.5rem)" }}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">Font scale</h3>
          <span className="text-xs text-white/60">{fontScale.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min="0.85"
          max="1.35"
          step="0.05"
          value={fontScale}
          onChange={handleFontScaleChange}
          aria-label="font scale"
        />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2, 0.5rem)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">Accessibility</h3>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <span>Reduced motion</span>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(event) => setReducedMotion(event.target.checked)}
            aria-label="toggle reduced motion"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <span>Large hit areas</span>
          <input
            type="checkbox"
            checked={largeHitAreas}
            onChange={(event) => setLargeHitAreas(event.target.checked)}
            aria-label="toggle large hit areas"
          />
        </label>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2, 0.5rem)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">Accent</h3>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="accent color">
          {ACCENT_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`select accent ${color}`}
              role="radio"
              aria-checked={accent === color}
              onClick={() => setAccent(color)}
              className={`h-7 w-7 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                accent === color ? "border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default SettingsDrawer;
