export const settingsTabs = [
  { id: "appearance", label: "Appearance" },
  { id: "accessibility", label: "Accessibility" },
  { id: "privacy", label: "Privacy" },
] as const;

export type SettingsTabId = (typeof settingsTabs)[number]["id"];

export type SettingsSubsection = {
  id: string;
  label: string;
};

export const settingsSubsections: Record<SettingsTabId, SettingsSubsection[]> = {
  appearance: [
    { id: "appearance-preview", label: "Preview" },
    { id: "appearance-theme", label: "Theme" },
    { id: "appearance-accent", label: "Accent" },
    { id: "appearance-wallpaper", label: "Wallpaper" },
    { id: "appearance-slideshow", label: "Background Slideshow" },
    { id: "appearance-library", label: "Wallpaper Gallery" },
    { id: "appearance-reset", label: "Reset" },
  ],
  accessibility: [
    { id: "accessibility-icon-size", label: "Icon Size" },
    { id: "accessibility-density", label: "Interface Density" },
    { id: "accessibility-reduced-motion", label: "Reduced Motion" },
    { id: "accessibility-high-contrast", label: "High Contrast" },
    { id: "accessibility-haptics", label: "Haptics" },
    { id: "accessibility-shortcuts", label: "Keyboard Shortcuts" },
  ],
  privacy: [
    { id: "privacy-backup", label: "Backup & Restore" },
  ],
};
