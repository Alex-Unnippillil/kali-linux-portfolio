"use client";

import { useEffect, useState } from "react";
import { kaliTheme } from "@/styles/themes/kali";

const STORAGE_KEY = "purple-palette";

export default function ThemeSwitcher() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setEnabled(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      const { button, link, badge } = kaliTheme.purple;
      root.style.setProperty("--color-primary", button);
      root.style.setProperty("--color-accent", link);
      root.style.setProperty("--color-link", link);
      root.style.setProperty("--color-badge-bg", badge.background);
      root.style.setProperty("--color-badge-text", badge.text);
      window.localStorage.setItem(STORAGE_KEY, "true");
    } else {
      root.style.removeProperty("--color-primary");
      root.style.removeProperty("--color-accent");
      root.style.removeProperty("--color-link");
      root.style.removeProperty("--color-badge-bg");
      root.style.removeProperty("--color-badge-text");
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [enabled]);

  return (
    <button
      type="button"
      className="btn"
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label="Toggle purple palette"
    >
      {enabled ? "Default Palette" : "Purple Palette"}
    </button>
  );
}
