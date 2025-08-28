import { getFontSize, setFontSize } from '../utils/fontSize';

describe('font size persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('font size persists across sessions', () => {
    setFontSize(20);
    expect(getFontSize()).toBe(20);
    expect(window.localStorage.getItem('app:font-size')).toBe('20');
  });
});
