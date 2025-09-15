import { loadLocaleFonts } from '../public/kali-ui';

describe('loadLocaleFonts', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.documentElement.lang = '';
  });

  it('does not inject fonts for English locale', () => {
    document.documentElement.lang = 'en';
    loadLocaleFonts(document);
    expect(document.head.querySelector('link[data-locale-font]')).toBeNull();
  });

  it('injects fonts for Japanese locale', () => {
    document.documentElement.lang = 'ja';
    loadLocaleFonts(document);
    const link = document.head.querySelector('link[data-locale-font]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('data-locale-font')).toBe('ja');
  });
});
