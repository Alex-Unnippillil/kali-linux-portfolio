import { contrastRatio } from '../components/apps/Games/common/theme';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeHex = (hex) => {
    if (!hex) return '#000000';
    let value = hex.trim();
    if (!value.startsWith('#')) {
        value = `#${value}`;
    }
    if (value.length === 4) {
        const [, r, g, b] = value;
        value = `#${r}${r}${g}${g}${b}${b}`;
    }
    return value.slice(0, 7).toLowerCase();
};

const hexToRgb = (hex) => {
    const normalized = normalizeHex(hex).slice(1);
    const int = parseInt(normalized, 16);
    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
    };
};

const rgbToHex = (r, g, b) => {
    const toHex = (component) => component.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
};

const rgbToHsl = (r, g, b) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        switch (max) {
        case rn:
            h = ((gn - bn) / delta + (gn < bn ? 6 : 0));
            break;
        case gn:
            h = ((bn - rn) / delta) + 2;
            break;
        default:
            h = ((rn - gn) / delta) + 4;
            break;
        }
        h *= 60;
    }

    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    return {
        h,
        s: s * 100,
        l: l * 100,
    };
};

const hslToRgb = (h, s, l) => {
    const hn = ((h % 360) + 360) % 360;
    const sn = clamp(s, 0, 100) / 100;
    const ln = clamp(l, 0, 100) / 100;

    if (sn === 0) {
        const value = Math.round(ln * 255);
        return { r: value, g: value, b: value };
    }

    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;

    const hueToRgb = (t) => {
        let temp = t;
        if (temp < 0) temp += 1;
        if (temp > 1) temp -= 1;
        if (temp < 1 / 6) return p + (q - p) * 6 * temp;
        if (temp < 1 / 2) return q;
        if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
        return p;
    };

    const hk = hn / 360;
    const r = Math.round(hueToRgb(hk + 1 / 3) * 255);
    const g = Math.round(hueToRgb(hk) * 255);
    const b = Math.round(hueToRgb(hk - 1 / 3) * 255);
    return { r, g, b };
};

const hexToHsl = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
};

const hslToHex = (h, s, l) => {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
};

const findAccessibleColor = (baseHsl, direction, textColor, minRatio) => {
    for (let step = 1; step <= 100; step += 1) {
        const lightness = clamp(baseHsl.l + direction * step, 0, 100);
        if (lightness === baseHsl.l && (lightness === 0 || lightness === 100)) {
            return null;
        }
        const candidate = hslToHex(baseHsl.h, baseHsl.s, lightness);
        const ratio = contrastRatio(candidate, textColor);
        if (ratio >= minRatio) {
            return { color: candidate, steps: step, ratio };
        }
        if (lightness === 0 || lightness === 100) {
            return null;
        }
    }
    return null;
};

export const getNearestAccessibleColor = (color, textColor, minRatio = 4.5) => {
    const normalizedColor = normalizeHex(color);
    const normalizedText = normalizeHex(textColor);
    const ratio = contrastRatio(normalizedColor, normalizedText);
    if (ratio >= minRatio) {
        return normalizedColor;
    }

    const hsl = hexToHsl(normalizedColor);
    const lighten = findAccessibleColor(hsl, 1, normalizedText, minRatio);
    const darken = findAccessibleColor(hsl, -1, normalizedText, minRatio);

    if (lighten && darken) {
        if (lighten.steps === darken.steps) {
            return (lighten.ratio >= darken.ratio ? lighten.color : darken.color);
        }
        return lighten.steps < darken.steps ? lighten.color : darken.color;
    }

    if (lighten) return lighten.color;
    if (darken) return darken.color;
    return normalizedColor;
};

export { contrastRatio };
