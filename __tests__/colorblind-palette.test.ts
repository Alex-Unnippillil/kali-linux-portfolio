import { contrastRatio } from '../components/apps/Games/common/theme';

const palette = {
  info: '#56B4E9',
  success: '#009E73',
  warning: '#F0E442',
  danger: '#D55E00',
};

const background = '#0f1317';

const matrices = {
  protanopia: [
    [0.56667, 0.43333, 0],
    [0.55833, 0.44167, 0],
    [0, 0.24167, 0.75833],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.43333, 0.56667],
    [0, 0.475, 0.525],
  ],
} as const;

type RGB = { r: number; g: number; b: number };

const hexToRgb = (hex: string): RGB => {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
};

const transform = ({ r, g, b }: RGB, matrix: number[][]): RGB => {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const [m1, m2, m3] = matrix;
  return {
    r: Math.round((R * m1[0] + G * m1[1] + B * m1[2]) * 255),
    g: Math.round((R * m2[0] + G * m2[1] + B * m2[2]) * 255),
    b: Math.round((R * m3[0] + G * m3[1] + B * m3[2]) * 255),
  };
};

const delta = (a: RGB, b: RGB): number =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

describe('color-blind palette', () => {
  test('maintains contrast against background', () => {
    Object.values(palette).forEach((color) => {
      expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5);
    });
  });

  test.each(Object.entries(matrices))(
    '%s simulation keeps state colors distinct',
    (_, matrix) => {
      const colors = Object.values(palette).map((hex) =>
        transform(hexToRgb(hex), matrix)
      );
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          expect(delta(colors[i], colors[j])).toBeGreaterThan(20);
        }
      }
    }
  );
});
