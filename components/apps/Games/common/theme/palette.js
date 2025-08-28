// Default palette using colors with sufficient contrast
export const defaultPalette = {
    primary: { bg: '#f3f4f6', fg: '#111827', icon: '●' }, // gray-100 / gray-900
    secondary: { bg: '#1d4ed8', fg: '#ffffff', icon: '▲' }, // blue-700
    success: { bg: '#15803d', fg: '#ffffff', icon: '✔' }, // green-700
    warning: { bg: '#d97706', fg: '#111827', icon: '!' }, // amber-600
    danger: { bg: '#b91c1c', fg: '#ffffff', icon: '✖' }, // red-700
};
// Colorblind-friendly palette based on Okabe-Ito colors
export const colorBlindPalette = {
    primary: { bg: '#f3f4f6', fg: '#111827', icon: '●' },
    secondary: { bg: '#0072b2', fg: '#ffffff', icon: '▲' },
    success: { bg: '#009e73', fg: '#111827', icon: '✔' },
    warning: { bg: '#d55e00', fg: '#111827', icon: '!' },
    danger: { bg: '#cc79a7', fg: '#111827', icon: '✖' },
};
