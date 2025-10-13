import { detectLocale, parseAcceptLanguage } from '../../lib/i18n/detector';
import { resolveLocalePath } from '../../lib/i18n/utils';
import { DEFAULT_LOCALE } from '../../lib/i18n/constants';

describe('locale detection', () => {
  it('prefers locale from the path and strips the default prefix', () => {
    const result = detectLocale({ pathname: '/en/apps/weather' });
    expect(result.locale).toBe(DEFAULT_LOCALE);
    expect(result.detectedFrom).toBe('path');
    expect(result.redirectPath).toBe('/apps/weather');
  });

  it('falls back to cookies when the path has no locale', () => {
    const result = detectLocale({ cookieHeader: 'NEXT_LOCALE=en' });
    expect(result.locale).toBe(DEFAULT_LOCALE);
    expect(result.detectedFrom).toBe('cookie');
    expect(result.redirectPath).toBeUndefined();
  });

  it('uses the accept-language header when no other hints are present', () => {
    const result = detectLocale({ acceptLanguageHeader: 'en-GB,en;q=0.8' });
    expect(result.locale).toBe(DEFAULT_LOCALE);
    expect(result.detectedFrom).toBe('header');
  });

  it('parses accept-language headers by priority', () => {
    const candidates = parseAcceptLanguage('fr-CA;q=0.7, fr;q=0.9, en;q=1.0');
    expect(candidates[0]).toBe('en');
  });

  it('produces stable locale-aware routes', () => {
    expect(resolveLocalePath(DEFAULT_LOCALE, '/en/about')).toBe('/about');
    expect(resolveLocalePath(DEFAULT_LOCALE, '/about')).toBe('/about');
  });
});
