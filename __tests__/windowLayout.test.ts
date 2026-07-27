import { DEFAULT_SNAP_BOTTOM_INSET, normalizeSnapBottomInset } from '../utils/windowLayout';

describe('normalizeSnapBottomInset', () => {
  it('returns the measured value when it is a positive finite number', () => {
    expect(normalizeSnapBottomInset(40)).toBe(40);
  });

  it('falls back to the default inset when value is zero or negative', () => {
    expect(normalizeSnapBottomInset(0)).toBe(DEFAULT_SNAP_BOTTOM_INSET);
    expect(normalizeSnapBottomInset(-10)).toBe(DEFAULT_SNAP_BOTTOM_INSET);
  });

  it('falls back to the default inset when value is not a number', () => {
    expect(normalizeSnapBottomInset(Number.NaN)).toBe(DEFAULT_SNAP_BOTTOM_INSET);
    expect(normalizeSnapBottomInset(undefined as unknown as number)).toBe(DEFAULT_SNAP_BOTTOM_INSET);
  });
});
