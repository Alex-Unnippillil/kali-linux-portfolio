import {
  DEFAULT_LOCALE,
  resolveLocale,
  formatDate,
  formatDateRange,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatRelativeTime,
} from '@/lib/intl';

describe('intl helpers', () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(global, 'navigator');

  afterEach(() => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(global, 'navigator', originalNavigatorDescriptor);
    } else {
      delete (global as typeof global & { navigator?: Navigator }).navigator;
    }
  });

  it('resolves locale from explicit string', () => {
    expect(resolveLocale('fr-FR')).toBe('fr-FR');
  });

  it('resolves locale from provided list', () => {
    expect(resolveLocale(['', 'de-DE', 'en-US'])).toBe('de-DE');
  });

  it('falls back to navigator languages', () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        languages: ['es-MX', 'en-US'],
        language: 'en-US',
      } as Navigator,
    });

    expect(resolveLocale()).toBe('es-MX');
  });

  it('uses default locale when navigator is unavailable', () => {
    delete (global as typeof global & { navigator?: Navigator }).navigator;
    expect(resolveLocale()).toBe(DEFAULT_LOCALE);
  });

  it('formats dates consistently across locales', () => {
    const isoDate = '2024-01-23T10:30:00.000Z';
    expect(
      formatDate(isoDate, { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }, 'en-US'),
    ).toMatchInlineSnapshot('"January 23, 2024 at 10:30 AM"');
    expect(
      formatDate(isoDate, { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }, 'fr-FR'),
    ).toMatchInlineSnapshot('"23 janvier 2024 à 10:30"');
    expect(
      formatDate(isoDate, { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }, 'ja-JP'),
    ).toMatchInlineSnapshot('"2024年1月23日 10:30"');
  });

  it('returns "Invalid Date" for unparsable input', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });

  it('formats number styles with locale aware separators', () => {
    expect(formatNumber(12345.678, { maximumFractionDigits: 3 }, 'de-DE')).toBe('12.345,678');
    expect(formatPercent(0.256, { maximumFractionDigits: 1 }, 'en-US')).toBe('25.6%');
  });

  it('formats currency output', () => {
    expect(formatCurrency(9876.5, 'EUR', { currencyDisplay: 'symbol' }, 'fr-FR')).toBe('9 876,50 €');
    expect(formatCurrency(9876.5, 'JPY', { currencyDisplay: 'symbol', maximumFractionDigits: 0 }, 'ja-JP')).toBe('￥9,877');
  });

  it('formats relative time', () => {
    expect(formatRelativeTime(-1, 'day', { numeric: 'auto' }, 'en-US')).toBe('yesterday');
    expect(formatRelativeTime(3, 'hour', {}, 'es-ES')).toBe('dentro de 3 horas');
  });

  it('formats date ranges when supported', () => {
    const start = '2024-03-01T08:00:00Z';
    const end = '2024-03-05T17:00:00Z';
    expect(
      formatDateRange(start, end, { dateStyle: 'medium', timeZone: 'UTC' }, 'en-US'),
    ).toMatchInlineSnapshot('"Mar 1 – 5, 2024"');
  });
});
