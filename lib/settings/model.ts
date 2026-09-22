/** Validated, browser-local desktop preferences. No credentials or app data. */
export const WORKSPACE_KEY = "kali:workspace-preferences:v1";
export const PROFILES_KEY = "kali:settings-profiles:v1";
export const BACKUP_LIMIT = 64 * 1024;
export const PROFILE_LIMIT = 8;
export const THEMES = ["default", "dark", "neon", "matrix"] as const;
export const WALLPAPERS = Array.from({ length: 8 }, (_, i) => `wall-${i + 1}`);
export const WALLPAPER_NAMES = [
  "Dunes",
  "Kali blue",
  "Mountain bridge",
  "After hours",
  "Quiet morning",
  "Ember",
  "Kali classic",
  "Forest light",
];

export interface WorkspacePreferences {
  wallpaperFit: "cover" | "contain";
  wallpaperDim: number;
  reduceTransparency: boolean;
  strongFocus: boolean;
  clockFormat: "system" | "12" | "24";
  showSeconds: boolean;
}
export const WORKSPACE_DEFAULTS: WorkspacePreferences = {
  wallpaperFit: "cover",
  wallpaperDim: 0,
  reduceTransparency: false,
  strongFocus: false,
  clockFormat: "system",
  showSeconds: false,
};
export interface SettingsSnapshot extends WorkspacePreferences {
  theme: (typeof THEMES)[number];
  accent: string;
  wallpaper: string;
  useKaliWallpaper: boolean;
  density: "regular" | "compact";
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  haptics: boolean;
  volume: number;
}
export const SNAPSHOT_DEFAULTS: SettingsSnapshot = {
  ...WORKSPACE_DEFAULTS,
  theme: "default",
  accent: "#1793d1",
  wallpaper: "wall-2",
  useKaliWallpaper: false,
  density: "regular",
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  haptics: true,
  volume: 100,
};
export const SETTING_LABELS: Record<keyof SettingsSnapshot, string> = {
  theme: "Desktop theme",
  accent: "Accent color",
  wallpaper: "Wallpaper",
  useKaliWallpaper: "Kali gradient wallpaper",
  density: "Interface density",
  reducedMotion: "Reduce motion",
  fontScale: "Text size",
  highContrast: "High contrast",
  largeHitAreas: "Larger click targets",
  pongSpin: "Pong spin effects",
  haptics: "Haptic feedback",
  volume: "App volume",
  wallpaperFit: "Wallpaper fit",
  wallpaperDim: "Wallpaper dimming",
  reduceTransparency: "Reduce transparency",
  strongFocus: "Stronger keyboard focus",
  clockFormat: "Clock format",
  showSeconds: "Show seconds",
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isFiniteRange = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

/** Validate everything before any write. Legacy network permissions are never imported. */
export function parsePreferences(value: unknown): Partial<SettingsSnapshot> {
  if (!isRecord(value)) throw new Error("Settings must be a JSON object.");
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    if (key === "allowNetwork") continue;
    if (!Object.prototype.hasOwnProperty.call(SNAPSHOT_DEFAULTS, key)) {
      throw new Error(`Unknown preference: ${key.slice(0, 60)}.`);
    }
    let valid = false;
    switch (key) {
      case "theme":
        valid = THEMES.includes(field as SettingsSnapshot["theme"]);
        break;
      case "accent":
        valid = typeof field === "string" && /^#[0-9a-f]{6}$/i.test(field);
        break;
      case "wallpaper":
        valid = WALLPAPERS.includes(field as string);
        break;
      case "density":
        valid = field === "regular" || field === "compact";
        break;
      case "wallpaperFit":
        valid = field === "cover" || field === "contain";
        break;
      case "clockFormat":
        valid = ["system", "12", "24"].includes(field as string);
        break;
      case "fontScale":
        valid = isFiniteRange(field, 0.75, 1.5);
        break;
      case "volume":
        valid = isFiniteRange(field, 0, 100);
        break;
      case "wallpaperDim":
        valid = isFiniteRange(field, 0, 70);
        break;
      default:
        valid = typeof field === "boolean";
    }
    if (!valid)
      throw new Error(
        `Invalid value for ${SETTING_LABELS[key as keyof SettingsSnapshot]}.`,
      );
    result[key] = field;
  }
  if (!Object.keys(result).length)
    throw new Error("This file contains no supported preferences.");
  return result as Partial<SettingsSnapshot>;
}

export function parseBackup(text: string): Partial<SettingsSnapshot> {
  if (text.length > BACKUP_LIMIT)
    throw new Error("Choose a settings file smaller than 64 KB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!isRecord(value))
    throw new Error("Choose a desktop settings backup, not an array or value.");
  if ("version" in value || "kind" in value || "settings" in value) {
    if (value.version !== 1 || value.kind !== "kali-desktop-settings") {
      throw new Error("This backup format or version is not supported.");
    }
    return parsePreferences(value.settings);
  }
  return parsePreferences(value);
}
export function exportBackup(settings: SettingsSnapshot): string {
  return JSON.stringify(
    {
      kind: "kali-desktop-settings",
      version: 1,
      settings: parsePreferences(settings),
    },
    null,
    2,
  );
}
export function workspaceFromSnapshot(
  settings: SettingsSnapshot,
): WorkspacePreferences {
  return Object.fromEntries(
    Object.keys(WORKSPACE_DEFAULTS).map((key) => [
      key,
      settings[key as keyof WorkspacePreferences],
    ]),
  ) as unknown as WorkspacePreferences;
}
export function loadWorkspacePreferences(
  storage: Storage,
): WorkspacePreferences {
  const text = storage.getItem(WORKSPACE_KEY);
  if (!text) return { ...WORKSPACE_DEFAULTS };
  const parsed = parsePreferences(JSON.parse(text));
  return workspaceFromSnapshot({ ...SNAPSHOT_DEFAULTS, ...parsed });
}
export function preferenceChanges(
  current: SettingsSnapshot,
  next: Partial<SettingsSnapshot>,
) {
  return (Object.keys(next) as (keyof SettingsSnapshot)[])
    .filter((key) => current[key] !== next[key])
    .map((key) => ({
      key,
      label: SETTING_LABELS[key],
      before: current[key],
      after: next[key],
    }));
}
export function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "On" : "Off";
  return String(value ?? "Default");
}
export function accentForeground(hex: string) {
  const channels = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

export interface SettingsProfile {
  id: string;
  name: string;
  settings: SettingsSnapshot;
}
export function parseProfiles(text: string | null): SettingsProfile[] {
  if (!text) return [];
  if (text.length > BACKUP_LIMIT)
    throw new Error("Saved profiles are too large.");
  const data: unknown = JSON.parse(text);
  if (
    !isRecord(data) ||
    data.version !== 1 ||
    !Array.isArray(data.profiles) ||
    data.profiles.length > PROFILE_LIMIT
  )
    throw new Error("Saved profiles are not valid.");
  const ids = new Set<string>();
  return data.profiles.map((profile) => {
    if (
      !isRecord(profile) ||
      typeof profile.id !== "string" ||
      !profile.id ||
      profile.id.length > 80 ||
      ids.has(profile.id) ||
      typeof profile.name !== "string" ||
      !profile.name.trim() ||
      profile.name.length > 40
    )
      throw new Error("A saved profile is not valid.");
    ids.add(profile.id);
    return {
      id: profile.id,
      name: profile.name,
      settings: { ...SNAPSHOT_DEFAULTS, ...parsePreferences(profile.settings) },
    };
  });
}
export function saveProfiles(storage: Storage, profiles: SettingsProfile[]) {
  const text = JSON.stringify({ version: 1, profiles });
  parseProfiles(text);
  storage.setItem(PROFILES_KEY, text);
}

/** Modes deliberately change only the listed preferences, never permissions or data. */
export const WORKSPACE_MODES = [
  {
    id: "everyday",
    name: "Everyday",
    description: "Balanced space and familiar controls.",
    settings: {
      density: "regular",
      fontScale: 1,
      reducedMotion: false,
      highContrast: false,
      largeHitAreas: false,
      reduceTransparency: false,
      strongFocus: false,
    },
  },
  {
    id: "focus",
    name: "Focus",
    description: "Less motion, quieter apps, fewer distractions.",
    settings: {
      reducedMotion: true,
      reduceTransparency: true,
      volume: 0,
      wallpaperDim: 25,
    },
  },
  {
    id: "present",
    name: "Presentation",
    description: "Larger type and easier-to-follow controls.",
    settings: {
      fontScale: 1.2,
      largeHitAreas: true,
      strongFocus: true,
      reducedMotion: true,
      density: "regular",
    },
  },
] satisfies {
  id: string;
  name: string;
  description: string;
  settings: Partial<SettingsSnapshot>;
}[];
