"use client";

import { useEffect, useState } from "react";

const PANEL_PREFIX = "xfce.panel.";

const getStep = (key: string, fallback: number) => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(`${PANEL_PREFIX}${key}`);
  const parsed = stored ? parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function useMediaKeys() {
  const [volumeStep, setVolumeStep] = useState(() => getStep("volume-step", 5));
  const [brightnessStep, setBrightnessStep] = useState(() => getStep("brightness-step", 10));
  const [volume, setVolume] = useState(100);
  const [brightness, setBrightness] = useState(100);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === `${PANEL_PREFIX}volume-step`) setVolumeStep(getStep("volume-step", 5));
      if (e.key === `${PANEL_PREFIX}brightness-step`) setBrightnessStep(getStep("brightness-step", 10));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "AudioVolumeUp":
          e.preventDefault();
          setVolume((v) => {
            const next = Math.min(100, v + volumeStep);
            document.documentElement.style.setProperty("--system-volume", String(next));
            return next;
          });
          break;
        case "AudioVolumeDown":
          e.preventDefault();
          setVolume((v) => {
            const next = Math.max(0, v - volumeStep);
            document.documentElement.style.setProperty("--system-volume", String(next));
            return next;
          });
          break;
        case "BrightnessUp":
          e.preventDefault();
          setBrightness((b) => {
            const next = Math.min(100, b + brightnessStep);
            document.documentElement.style.setProperty("--system-brightness", String(next));
            document.documentElement.style.setProperty("filter", `brightness(${next}%)`);
            return next;
          });
          break;
        case "BrightnessDown":
          e.preventDefault();
          setBrightness((b) => {
            const next = Math.max(0, b - brightnessStep);
            document.documentElement.style.setProperty("--system-brightness", String(next));
            document.documentElement.style.setProperty("filter", `brightness(${next}%)`);
            return next;
          });
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [volumeStep, brightnessStep]);
}
