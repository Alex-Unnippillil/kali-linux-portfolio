export const UBUNTU_THEME_STORAGE_KEYS = {
  WALLPAPER: "bg-image",
  BOOTING_SCREEN: "booting_screen",
  SCREEN_LOCKED: "screen-locked",
  SHUT_DOWN: "shut-down",
} as const;

type UbuntuThemeStorageKey =
  (typeof UBUNTU_THEME_STORAGE_KEYS)[keyof typeof UBUNTU_THEME_STORAGE_KEYS];

const serializeValue = (value: string | boolean): string =>
  typeof value === "boolean" ? String(value) : value;

export const getUbuntuThemeStorageItem = (
  storage: Storage | undefined,
  key: UbuntuThemeStorageKey,
): string | null => storage?.getItem(key) ?? null;

export const setUbuntuThemeStorageItem = (
  storage: Storage | undefined,
  key: UbuntuThemeStorageKey,
  value: string | boolean,
): void => {
  storage?.setItem(key, serializeValue(value));
};
