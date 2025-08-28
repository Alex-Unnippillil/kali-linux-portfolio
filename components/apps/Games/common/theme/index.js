import { defaultPalette, colorBlindPalette } from './palette';
// Calculate relative luminance according to WCAG 2.1
const luminance = (hex) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    const toLinear = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const [lr, lg, lb] = [r, g, b].map(toLinear);
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};
// Compute contrast ratio per WCAG formula
export const contrastRatio = (fg, bg) => {
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (light + 0.05) / (dark + 0.05);
};
// Validate that all palette entries meet a minimum contrast ratio
export const validateContrast = (palette, minRatio = 4.5) => Object.values(palette).every(({ fg, bg }) => contrastRatio(fg, bg) >= minRatio);
// Generate a high contrast variant of a palette using black backgrounds and white text
const toHighContrast = (palette) => Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, { ...v, bg: '#000000', fg: '#ffffff' }]));
// Retrieve the appropriate palette based on color blindness and contrast settings
export const getThemePalette = (opts = {}) => {
    let base = opts.colorBlind ? colorBlindPalette : defaultPalette;
    if (opts.highContrast)
        base = toHighContrast(base);
    return base;
};
export { defaultPalette, colorBlindPalette } from './palette';
