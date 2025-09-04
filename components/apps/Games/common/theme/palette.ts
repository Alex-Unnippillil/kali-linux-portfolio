export interface PaletteColor {
  bg: string; // background color in hex
  fg: string; // foreground/text color in hex
  icon: string; // non-color indicator
}

export type Palette = Record<string, PaletteColor>;

// Default palette using colors with sufficient contrast
export const defaultPalette: Palette = {
  primary: { bg: '#f3f4f6', fg: '#111827', icon: '●' }, // gray-100 / gray-900
  secondary: { bg: '#1d4ed8', fg: '#ffffff', icon: '▲' }, // blue-700
  success: { bg: '#15803d', fg: '#ffffff', icon: '✔' }, // green-700
  warning: { bg: '#d97706', fg: '#111827', icon: '!' }, // amber-600
  danger: { bg: '#b91c1c', fg: '#ffffff', icon: '✖' }, // red-700
};

// Protanopia-friendly palette derived from Okabe-Ito colors
export const protanopiaPalette: Palette = {
  primary: { bg: '#f3f4f6', fg: '#111827', icon: '●' },
  secondary: { bg: '#0072b2', fg: '#ffffff', icon: '▲' },
  success: { bg: '#009e73', fg: '#111827', icon: '✔' },
  warning: { bg: '#56b4e9', fg: '#111827', icon: '!' },
  danger: { bg: '#cc79a7', fg: '#111827', icon: '✖' },
};

// Deuteranopia-friendly palette with high-contrast hues
export const deuteranopiaPalette: Palette = {
  primary: { bg: '#f3f4f6', fg: '#111827', icon: '●' },
  secondary: { bg: '#0072b2', fg: '#ffffff', icon: '▲' },
  success: { bg: '#e69f00', fg: '#111827', icon: '✔' },
  warning: { bg: '#f0e442', fg: '#111827', icon: '!' },
  danger: { bg: '#cc79a7', fg: '#111827', icon: '✖' },
};

// Tritanopia-friendly palette avoiding blue/yellow confusion
export const tritanopiaPalette: Palette = {
  primary: { bg: '#f3f4f6', fg: '#111827', icon: '●' },
  secondary: { bg: '#d55e00', fg: '#111827', icon: '▲' },
  success: { bg: '#009e73', fg: '#111827', icon: '✔' },
  warning: { bg: '#e69f00', fg: '#111827', icon: '!' },
  danger: { bg: '#cc79a7', fg: '#111827', icon: '✖' },
};

// High contrast palette using distinct tokens
export const highContrastPalette: Palette = {
  primary: { bg: '#000000', fg: '#ffffff', icon: '●' },
  secondary: { bg: '#ffff00', fg: '#000000', icon: '▲' },
  success: { bg: '#00ffff', fg: '#000000', icon: '✔' },
  warning: { bg: '#ff33ff', fg: '#000000', icon: '!' },
  danger: { bg: '#990000', fg: '#ffffff', icon: '✖' },
};

