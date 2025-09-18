export type SettingsSectionId = 'appearance' | 'accessibility' | 'privacy';

export interface SettingsControl {
  slug: string;
  label: string;
  description?: string;
  keywords?: string[];
}

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  controls: SettingsControl[];
}

export const navigation: ReadonlyArray<SettingsSection> = [
  {
    id: 'appearance',
    label: 'Appearance',
    controls: [
      {
        slug: 'theme',
        label: 'Theme',
        description: 'Switch between desktop themes',
        keywords: ['mode', 'dark', 'light', 'neon', 'matrix'],
      },
      {
        slug: 'accent',
        label: 'Accent color',
        description: 'Adjust highlight color used across the UI',
        keywords: ['color', 'highlight', 'primary'],
      },
      {
        slug: 'wallpaper-slider',
        label: 'Wallpaper slider',
        description: 'Scrub through wallpapers using the range input',
        keywords: ['background', 'image', 'preview'],
      },
      {
        slug: 'wallpaper-slideshow',
        label: 'Background slideshow',
        description: 'Cycle selected wallpapers automatically',
        keywords: ['rotate', 'cycle', 'timer', 'slideshow'],
      },
      {
        slug: 'wallpaper-gallery',
        label: 'Wallpaper gallery',
        description: 'Select a wallpaper from the gallery grid',
        keywords: ['background', 'image', 'grid', 'thumbnail'],
      },
      {
        slug: 'reset-desktop',
        label: 'Reset desktop',
        description: 'Restore default wallpaper, accent and density',
        keywords: ['factory reset', 'defaults', 'restore'],
      },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    controls: [
      {
        slug: 'icon-size',
        label: 'Icon size',
        description: 'Scale app icons and UI typography',
        keywords: ['font', 'size', 'scale', 'accessibility'],
      },
      {
        slug: 'density',
        label: 'Density',
        description: 'Adjust spacing between interface elements',
        keywords: ['spacing', 'compact', 'layout'],
      },
      {
        slug: 'reduced-motion',
        label: 'Reduced motion',
        description: 'Toggle motion-reduced animations',
        keywords: ['animation', 'motion', 'prefers reduced motion'],
      },
      {
        slug: 'high-contrast',
        label: 'High contrast',
        description: 'Improve color contrast for readability',
        keywords: ['contrast', 'accessibility', 'vision'],
      },
      {
        slug: 'haptics',
        label: 'Haptics',
        description: 'Enable tactile feedback for supported actions',
        keywords: ['vibration', 'feedback'],
      },
      {
        slug: 'keyboard-shortcuts',
        label: 'Keyboard shortcuts',
        description: 'Edit desktop shortcut bindings',
        keywords: ['keymap', 'rebinding', 'shortcuts'],
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    controls: [
      {
        slug: 'export-settings',
        label: 'Export settings',
        description: 'Download a backup of your desktop preferences',
        keywords: ['backup', 'download', 'json'],
      },
      {
        slug: 'import-settings',
        label: 'Import settings',
        description: 'Restore desktop preferences from a file',
        keywords: ['upload', 'restore', 'json'],
      },
    ],
  },
];

export const getSectionById = (
  id: SettingsSectionId,
): SettingsSection | undefined => navigation.find((section) => section.id === id);
