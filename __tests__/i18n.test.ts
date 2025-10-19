import { translate, setLocale, getLocale, __unsafe_resetI18nStateForTests } from '../lib/i18n';

describe('i18n utilities', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    __unsafe_resetI18nStateForTests();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the default translation when no locale is set', () => {
    expect(getLocale()).toBe('en');
    expect(translate('common.clipboard.copied')).toBe('Copied to clipboard');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('falls back to the default locale for unsupported languages', () => {
    expect(translate('common.clipboard.copied', { locale: 'es-ES' })).toBe('Copied to clipboard');
    expect(warnSpy).toHaveBeenCalledWith('Unsupported locale "es-ES". Falling back to "en".');

    warnSpy.mockClear();
    expect(translate('common.clipboard.copied', { locale: 'es-ES' })).toBe('Copied to clipboard');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('respects explicit locale changes', () => {
    setLocale('fr');
    expect(getLocale()).toBe('fr');
    expect(translate('common.clipboard.copied')).toBe('Copié dans le presse-papiers');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('uses provided fallback messages when a key is missing', () => {
    const fallback = 'Default clipboard announcement';
    expect(translate('common.missing-key', { fallback })).toBe(fallback);
    expect(warnSpy).toHaveBeenCalledWith(
      'Missing translation for "common.missing-key". Using provided fallback value.',
    );
  });
});
