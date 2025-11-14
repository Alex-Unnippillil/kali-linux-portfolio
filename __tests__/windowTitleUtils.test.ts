import { isElementTextTruncated, TITLE_TRUNCATION_EPSILON } from '../components/base/windowTitleUtils';

describe('isElementTextTruncated', () => {
  it('returns false for null elements', () => {
    expect(isElementTextTruncated(null)).toBe(false);
  });

  it('returns true when scroll width exceeds client width by more than epsilon', () => {
    const node = { clientWidth: 120, scrollWidth: 120 + TITLE_TRUNCATION_EPSILON + 2 } as HTMLElement;
    expect(isElementTextTruncated(node)).toBe(true);
  });

  it('returns false when widths are not finite', () => {
    const invalid = { clientWidth: Number.NaN, scrollWidth: 200 } as unknown as HTMLElement;
    expect(isElementTextTruncated(invalid)).toBe(false);
  });
});
