import tokens, { colors, spacing, radii, shadows, zIndex } from '../tokens';

type RecordLike = Record<string, unknown>;

const expectDeepFrozen = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return;
  }

  expect(Object.isFrozen(value)).toBe(true);

  Object.values(value as RecordLike).forEach((child) => {
    if (child && typeof child === 'object') {
      expectDeepFrozen(child);
    }
  });
};

describe('design tokens', () => {
  it('exposes deep-frozen token maps', () => {
    expectDeepFrozen(tokens);
    expectDeepFrozen(colors);
    expectDeepFrozen(spacing);
    expectDeepFrozen(radii);
    expectDeepFrozen(shadows);
    expectDeepFrozen(zIndex);
  });

  it('keeps spacing tokens tied to CSS custom properties', () => {
    expect.assertions(Object.keys(spacing).length);
    Object.entries(spacing).forEach(([token, value]) => {
      const expectedPrefix = token === 'hit-area' ? '^var\\(--hit-area' : '^var\\(--space-';
      expect(String(value)).toMatch(new RegExp(expectedPrefix));
    });
  });

  it('keeps radius tokens tied to CSS custom properties', () => {
    expect.assertions(Object.keys(radii).length);
    Object.values(radii).forEach((value) => {
      expect(String(value)).toMatch(/^var\(--radius-/);
    });
  });

  it('keeps box shadows tied to CSS custom properties', () => {
    expect.assertions(Object.keys(shadows.box).length);
    Object.values(shadows.box).forEach((value) => {
      expect(String(value)).toMatch(/^var\(--shadow-/);
    });
  });

  it('keeps drop shadows tied to CSS custom properties', () => {
    expect.assertions(Object.keys(shadows.drop).length);
    Object.values(shadows.drop).forEach((value) => {
      expect(String(value)).toMatch(/^var\(--shadow-/);
    });
  });

  it('keeps z-index tokens tied to CSS custom properties', () => {
    expect.assertions(Object.keys(zIndex).length);
    Object.values(zIndex).forEach((value) => {
      expect(String(value)).toMatch(/^var\(--z-/);
    });
  });
});
