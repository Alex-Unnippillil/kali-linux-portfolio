"use client";

import { ChangeEvent } from "react";
import { useSettings } from "../../hooks/useSettings";

const ICON_THEMES = ["Yaru", "Kali"] as const;

export default function Appearance() {
  const {
    theme,
    setTheme,
    fontScale,
    setFontScale,
    iconTheme,
    setIconTheme,
  } = useSettings();

  const handleStyleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    // Map Kali-Light to default theme
    if (value === "light") setTheme("default");
    else setTheme("dark");
  };

  const handleIconThemeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setIconTheme(e.target.value);
  };

  return (
    <div className="p-4 space-y-6 text-ubt-grey">
      <div className="flex items-center gap-2">
        <label className="w-32" htmlFor="style-select">Style:</label>
        <select
          id="style-select"
          value={theme === "dark" ? "dark" : "light"}
          onChange={handleStyleChange}
          className="bg-ub-cool-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="dark">Kali-Dark</option>
          <option value="light">Kali-Light</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="w-32" htmlFor="icon-theme-select">Icon Theme:</label>
        <select
          id="icon-theme-select"
          value={iconTheme}
          onChange={handleIconThemeChange}
          className="bg-ub-cool-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          {ICON_THEMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <label className="w-32" htmlFor="font-scale">Font Size:</label>
        <input
          id="font-scale"
          type="range"
          min="0.8"
          max="1.5"
          step="0.05"
          value={fontScale}
          onChange={(e) => setFontScale(parseFloat(e.target.value))}
          className="ubuntu-slider flex-1"
        />
      </div>
    </div>
  );
}

