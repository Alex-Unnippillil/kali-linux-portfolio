import { getThemePalette, validateContrast, contrastRatio, defaultPalette, colorBlindPalette, } from '../components/apps/Games/common/theme';
describe('game theme accessibility', () => {
    test('default palette meets WCAG AA contrast', () => {
        expect(validateContrast(defaultPalette)).toBe(true);
    });
    test('colorblind palette meets WCAG AA contrast', () => {
        expect(validateContrast(colorBlindPalette)).toBe(true);
    });
    test('high contrast mode exceeds WCAG AAA contrast', () => {
        const high = getThemePalette({ highContrast: true });
        Object.values(high).forEach(({ fg, bg }) => {
            expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(7);
        });
    });
    test('palettes provide non-color cues', () => {
        const palette = getThemePalette();
        Object.values(palette).forEach((entry) => {
            expect(entry.icon).toBeTruthy();
        });
    });
});
