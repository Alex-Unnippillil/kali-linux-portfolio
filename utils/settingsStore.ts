"use client";

import { get, set, del } from "idb-keyval";
import type { UbuntuThemeToken } from "../components/ubuntu";
import { getTheme, setTheme } from "./theme";
import { UBUNTU_THEME_STORAGE_KEYS } from "./ubuntuThemeTokens";

type DensitySetting = "regular" | "compact";

interface SettingsDefaults {
  accent: string;
  wallpaper: string;
  useKaliWallpaper: boolean;
  density: DensitySetting;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
}

interface SerializableSettings extends Partial<SettingsDefaults> {
  theme?: string;
}

const WALLPAPER_STORAGE_KEY: UbuntuThemeToken =
  UBUNTU_THEME_STORAGE_KEYS.WALLPAPER;

const DEFAULT_SETTINGS: SettingsDefaults = {
  accent: "#1793d1",
  wallpaper: "wall-2",
  useKaliWallpaper: false,
  density: "regular",
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
};

const setBooleanPreference = (key: string, value: boolean): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "true" : "false");
};

const getBooleanPreference = (key: string, fallback: boolean): boolean => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  return stored === null ? fallback : stored === "true";
};

const isDensitySetting = (value: string | null): value is DensitySetting =>
  value === "regular" || value === "compact";

export async function getAccent(): Promise<string> {
  if (typeof window === "undefined") return DEFAULT_SETTINGS.accent;
  return (await get<string>("accent")) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent: string): Promise<void> {
  if (typeof window === "undefined") return;
  await set("accent", accent);
}

export async function getWallpaper(): Promise<string> {
  if (typeof window === "undefined") return DEFAULT_SETTINGS.wallpaper;
  return (await get<string>(WALLPAPER_STORAGE_KEY)) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper: string): Promise<void> {
  if (typeof window === "undefined") return;
  await set(WALLPAPER_STORAGE_KEY, wallpaper);
}

export async function getUseKaliWallpaper(): Promise<boolean> {
  return getBooleanPreference("use-kali-wallpaper", DEFAULT_SETTINGS.useKaliWallpaper);
}

export async function setUseKaliWallpaper(value: boolean): Promise<void> {
  setBooleanPreference("use-kali-wallpaper", value);
}

export async function getDensity(): Promise<DensitySetting> {
  if (typeof window === "undefined") return DEFAULT_SETTINGS.density;
  const stored = window.localStorage.getItem("density");
  return isDensitySetting(stored) ? stored : DEFAULT_SETTINGS.density;
}

export async function setDensity(density: DensitySetting): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("density", density);
}

export async function getReducedMotion(): Promise<boolean> {
  if (typeof window === "undefined") return DEFAULT_SETTINGS.reducedMotion;
  const stored = window.localStorage.getItem("reduced-motion");
  if (stored !== null) {
    return stored === "true";
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function setReducedMotion(value: boolean): Promise<void> {
  setBooleanPreference("reduced-motion", value);
}

export async function getFontScale(): Promise<number> {
  if (typeof window === "undefined") return DEFAULT_SETTINGS.fontScale;
  const stored = window.localStorage.getItem("font-scale");
  return stored ? Number.parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale: number): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("font-scale", String(scale));
}

export async function getHighContrast(): Promise<boolean> {
  return getBooleanPreference("high-contrast", DEFAULT_SETTINGS.highContrast);
}

export async function setHighContrast(value: boolean): Promise<void> {
  setBooleanPreference("high-contrast", value);
}

export async function getLargeHitAreas(): Promise<boolean> {
  return getBooleanPreference("large-hit-areas", DEFAULT_SETTINGS.largeHitAreas);
}

export async function setLargeHitAreas(value: boolean): Promise<void> {
  setBooleanPreference("large-hit-areas", value);
}

export async function getHaptics(): Promise<boolean> {
  return getBooleanPreference("haptics", DEFAULT_SETTINGS.haptics);
}

export async function setHaptics(value: boolean): Promise<void> {
  setBooleanPreference("haptics", value);
}

export async function getPongSpin(): Promise<boolean> {
  return getBooleanPreference("pong-spin", DEFAULT_SETTINGS.pongSpin);
}

export async function setPongSpin(value: boolean): Promise<void> {
  setBooleanPreference("pong-spin", value);
}

export async function getAllowNetwork(): Promise<boolean> {
  return getBooleanPreference("allow-network", DEFAULT_SETTINGS.allowNetwork);
}

export async function setAllowNetwork(value: boolean): Promise<void> {
  setBooleanPreference("allow-network", value);
}

export async function resetSettings(): Promise<void> {
  if (typeof window === "undefined") return;
  await Promise.all([del("accent"), del(WALLPAPER_STORAGE_KEY)]);
  window.localStorage.removeItem("density");
  window.localStorage.removeItem("reduced-motion");
  window.localStorage.removeItem("font-scale");
  window.localStorage.removeItem("high-contrast");
  window.localStorage.removeItem("large-hit-areas");
  window.localStorage.removeItem("pong-spin");
  window.localStorage.removeItem("allow-network");
  window.localStorage.removeItem("haptics");
  window.localStorage.removeItem("use-kali-wallpaper");
}

export async function exportSettings(): Promise<string> {
  const [
    accent,
    wallpaper,
    useKaliWallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
  ] = await Promise.all([
    getAccent(),
    getWallpaper(),
    getUseKaliWallpaper(),
    getDensity(),
    getReducedMotion(),
    getFontScale(),
    getHighContrast(),
    getLargeHitAreas(),
    getPongSpin(),
    getAllowNetwork(),
    getHaptics(),
  ]);
  const theme = getTheme();
  return JSON.stringify({
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    useKaliWallpaper,
    theme,
  });
}

export async function importSettings(json: unknown): Promise<void> {
  if (typeof window === "undefined") return;
  let settings: SerializableSettings;
  try {
    settings =
      typeof json === "string" ? (JSON.parse(json) as SerializableSettings) : (json as SerializableSettings);
  } catch (error) {
    console.error("Invalid settings", error);
    return;
  }

  const {
    accent,
    wallpaper,
    useKaliWallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
  } = settings;

  if (accent !== undefined) await setAccent(accent);
  if (wallpaper !== undefined) await setWallpaper(wallpaper);
  if (useKaliWallpaper !== undefined) await setUseKaliWallpaper(useKaliWallpaper);
  if (density !== undefined) await setDensity(density);
  if (reducedMotion !== undefined) await setReducedMotion(reducedMotion);
  if (fontScale !== undefined) await setFontScale(fontScale);
  if (highContrast !== undefined) await setHighContrast(highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork);
  if (haptics !== undefined) await setHaptics(haptics);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
