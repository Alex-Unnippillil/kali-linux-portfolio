export type SettingsNavigationActionKind =
  | 'button'
  | 'toggle'
  | 'select'
  | 'color'
  | 'range';

export interface SettingsNavigationActionOption {
  id: string;
  label: string;
  value?: string;
}

export interface SettingsNavigationAction {
  id: string;
  title: string;
  description?: string;
  callbackId: string;
  kind: SettingsNavigationActionKind;
  options?: ReadonlyArray<SettingsNavigationActionOption>;
}

export interface SettingsNavigationAnchor {
  id: string;
  title: string;
  description?: string;
  callbackId?: string;
}

export interface SettingsNavigationSection {
  id: string;
  title: string;
  description?: string;
  anchors: ReadonlyArray<SettingsNavigationAnchor>;
  topActions?: ReadonlyArray<SettingsNavigationAction>;
}

export interface SettingsNavigationBucket {
  id:
    | 'system'
    | 'devices'
    | 'network'
    | 'privacy'
    | 'accessibility'
    | 'personalization'
    | 'updates'
    | 'about';
  title: string;
  sections: ReadonlyArray<SettingsNavigationSection>;
}

export const themeOptions = [
  { id: 'default', label: 'Default' },
  { id: 'dark', label: 'Dark' },
  { id: 'neon', label: 'Neon' },
  { id: 'matrix', label: 'Matrix' },
] as const satisfies ReadonlyArray<SettingsNavigationActionOption>;

export const accentColorOptions = [
  { id: 'kali-blue', label: 'Kali Blue', value: '#1793d1' },
  { id: 'scarlet', label: 'Scarlet Red', value: '#e53e3e' },
  { id: 'ember', label: 'Ember Orange', value: '#d97706' },
  { id: 'emerald', label: 'Emerald Green', value: '#38a169' },
  { id: 'amethyst', label: 'Amethyst Purple', value: '#805ad5' },
  { id: 'fuchsia', label: 'Fuchsia Pink', value: '#ed64a6' },
] as const satisfies ReadonlyArray<SettingsNavigationActionOption>;

export const accentColorValues = accentColorOptions.map(
  (option) => option.value ?? option.id,
) as readonly string[];

export const wallpaperPresets = [
  { id: 'wall-1', label: 'Wallpaper 1' },
  { id: 'wall-2', label: 'Wallpaper 2' },
  { id: 'wall-3', label: 'Wallpaper 3' },
  { id: 'wall-4', label: 'Wallpaper 4' },
  { id: 'wall-5', label: 'Wallpaper 5' },
  { id: 'wall-6', label: 'Wallpaper 6' },
  { id: 'wall-7', label: 'Wallpaper 7' },
  { id: 'wall-8', label: 'Wallpaper 8' },
] as const satisfies ReadonlyArray<SettingsNavigationActionOption>;

export const wallpaperIds = wallpaperPresets.map((preset) => preset.id) as readonly string[];

const densityOptions = [
  { id: 'regular', label: 'Regular', value: 'regular' },
  { id: 'compact', label: 'Compact', value: 'compact' },
] as const satisfies ReadonlyArray<SettingsNavigationActionOption>;

export const settingsNavigation = [
  {
    id: 'system',
    title: 'System',
    sections: [
      {
        id: 'system-maintenance',
        title: 'Maintenance',
        description: 'Restore the desktop to factory defaults when needed.',
        anchors: [
          {
            id: 'reset-desktop',
            title: 'Reset desktop',
            description:
              'Clear cached preferences and return to the default wallpaper and layout.',
            callbackId: 'handleReset',
          },
        ],
        topActions: [
          {
            id: 'reset-desktop-action',
            title: 'Reset desktop',
            description: 'Restore wallpapers, themes, and window layout to defaults.',
            callbackId: 'handleReset',
            kind: 'button',
          },
        ],
      },
    ],
  },
  {
    id: 'devices',
    title: 'Devices',
    sections: [
      {
        id: 'device-feedback',
        title: 'Input & feedback',
        description: 'Configure vibration-style feedback for supported controls.',
        anchors: [
          {
            id: 'haptics',
            title: 'Haptics',
            description: 'Toggle desktop haptic feedback for compatible apps.',
            callbackId: 'setHaptics',
          },
        ],
        topActions: [
          {
            id: 'haptics-toggle',
            title: 'Haptics',
            description: 'Enable or disable vibration feedback across the desktop.',
            callbackId: 'setHaptics',
            kind: 'toggle',
          },
        ],
      },
    ],
  },
  {
    id: 'network',
    title: 'Network',
    sections: [],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    sections: [
      {
        id: 'privacy-data',
        title: 'Data control',
        description: 'Back up or restore your personalization choices.',
        anchors: [
          {
            id: 'export-settings',
            title: 'Export settings',
            description: 'Download a JSON backup of all desktop preferences.',
            callbackId: 'handleExport',
          },
          {
            id: 'import-settings',
            title: 'Import settings',
            description: 'Restore a previously exported JSON configuration.',
            callbackId: 'triggerImport',
          },
        ],
        topActions: [
          {
            id: 'export-settings-action',
            title: 'Export settings',
            description: 'Download the current configuration as JSON.',
            callbackId: 'handleExport',
            kind: 'button',
          },
          {
            id: 'import-settings-action',
            title: 'Import settings',
            description: 'Choose a JSON file to restore your configuration.',
            callbackId: 'triggerImport',
            kind: 'button',
          },
        ],
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    sections: [
      {
        id: 'accessibility-display',
        title: 'Display & layout',
        description: 'Adjust interface scale and spacing for readability.',
        anchors: [
          {
            id: 'icon-size',
            title: 'Icon size',
            description: 'Scale dock and desktop icons between 75% and 150%.',
            callbackId: 'setFontScale',
          },
          {
            id: 'density',
            title: 'Interface density',
            description: 'Toggle compact mode for tighter spacing.',
            callbackId: 'setDensity',
          },
        ],
        topActions: [
          {
            id: 'icon-size-action',
            title: 'Icon size',
            description: 'Fine-tune icon scale for comfort.',
            callbackId: 'setFontScale',
            kind: 'range',
          },
          {
            id: 'density-action',
            title: 'Interface density',
            description: 'Switch between regular and compact spacing presets.',
            callbackId: 'setDensity',
            kind: 'select',
            options: densityOptions,
          },
        ],
      },
      {
        id: 'accessibility-visibility',
        title: 'Visibility',
        description: 'Reduce animation and boost contrast for clarity.',
        anchors: [
          {
            id: 'reduced-motion',
            title: 'Reduced motion',
            description: 'Disable non-essential motion effects.',
            callbackId: 'setReducedMotion',
          },
          {
            id: 'high-contrast',
            title: 'High contrast',
            description: 'Overlay a high-contrast theme for legibility.',
            callbackId: 'setHighContrast',
          },
        ],
        topActions: [
          {
            id: 'reduced-motion-action',
            title: 'Reduced motion',
            description: 'Toggle motion-reduction across the desktop.',
            callbackId: 'setReducedMotion',
            kind: 'toggle',
          },
          {
            id: 'high-contrast-action',
            title: 'High contrast',
            description: 'Enable a high-contrast overlay for UI elements.',
            callbackId: 'setHighContrast',
            kind: 'toggle',
          },
        ],
      },
      {
        id: 'accessibility-input',
        title: 'Input',
        description: 'Customize keyboard access and shortcuts.',
        anchors: [
          {
            id: 'keyboard-shortcuts',
            title: 'Keyboard shortcuts',
            description: 'Open the keyboard shortcut editor overlay.',
            callbackId: 'openKeymap',
          },
        ],
        topActions: [
          {
            id: 'keyboard-shortcuts-action',
            title: 'Edit shortcuts',
            description: 'Launch the overlay to remap keyboard shortcuts.',
            callbackId: 'openKeymap',
            kind: 'button',
          },
        ],
      },
    ],
  },
  {
    id: 'personalization',
    title: 'Personalization',
    sections: [
      {
        id: 'personalization-appearance',
        title: 'Appearance',
        description: 'Select themes, accent colors, and wallpapers.',
        anchors: [
          {
            id: 'theme',
            title: 'Theme',
            description: 'Switch between bundled desktop themes.',
            callbackId: 'setTheme',
          },
          {
            id: 'accent',
            title: 'Accent color',
            description: 'Choose the highlight color used across the UI.',
            callbackId: 'setAccent',
          },
          {
            id: 'wallpaper',
            title: 'Wallpaper',
            description: 'Pick a wallpaper from the Kali-inspired gallery.',
            callbackId: 'setWallpaper',
          },
        ],
        topActions: [
          {
            id: 'theme-action',
            title: 'Theme',
            description: 'Cycle through bundled desktop themes.',
            callbackId: 'setTheme',
            kind: 'select',
            options: themeOptions,
          },
          {
            id: 'accent-action',
            title: 'Accent color',
            description: 'Pick a highlight color from the Kali palette.',
            callbackId: 'setAccent',
            kind: 'color',
            options: accentColorOptions,
          },
          {
            id: 'wallpaper-action',
            title: 'Wallpaper',
            description: 'Browse curated wallpapers for the desktop.',
            callbackId: 'setWallpaper',
            kind: 'select',
            options: wallpaperPresets,
          },
        ],
      },
      {
        id: 'personalization-backgrounds',
        title: 'Background slideshow',
        description: 'Rotate wallpapers on a schedule using the slideshow panel.',
        anchors: [
          {
            id: 'background-slideshow',
            title: 'Background slideshow',
            description: 'Configure wallpaper rotation and timing.',
          },
        ],
        topActions: [],
      },
    ],
  },
  {
    id: 'updates',
    title: 'Updates',
    sections: [],
  },
  {
    id: 'about',
    title: 'About',
    sections: [],
  },
] as const satisfies ReadonlyArray<SettingsNavigationBucket>;
