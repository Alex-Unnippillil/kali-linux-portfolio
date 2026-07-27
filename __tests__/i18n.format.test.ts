import {
  createLocaleFormatters,
  formatDate,
  formatNumber,
  formatPlural,
  PluralForms,
} from '../src/i18n/format';

describe('i18n format helpers', () => {
  const sampleDate = new Date(Date.UTC(2023, 0, 15, 13, 45, 30));
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const numberOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currencyDisplay: 'symbol',
  };

  const pluralForms: PluralForms = {
    zero: 'no files',
    one: 'one file',
    other: 'many files',
  };

  it('formats dates across locales', () => {
    expect({
      'en-US': formatDate(sampleDate, 'en-US', dateOptions),
      'fr-FR': formatDate(sampleDate, 'fr-FR', dateOptions),
      'ja-JP': formatDate(sampleDate, 'ja-JP', dateOptions),
    }).toMatchInlineSnapshot(`
      {
        "en-US": "01/15/2023",
        "fr-FR": "15/01/2023",
        "ja-JP": "2023/01/15",
      }
    `);
  });

  it('formats currency across locales', () => {
    expect({
      'en-US': formatNumber(1234.56, 'en-US', { ...numberOptions, currency: 'USD' }),
      'fr-FR': formatNumber(1234.56, 'fr-FR', { ...numberOptions, currency: 'EUR' }),
      'ja-JP': formatNumber(1234.56, 'ja-JP', { ...numberOptions, currency: 'JPY' }),
    }).toMatchInlineSnapshot(`
      {
        "en-US": "$1,234.56",
        "fr-FR": "1\u202f234,56\u00a0€",
        "ja-JP": "\uffe51,235",
      }
    `);
  });

  it('selects plural forms for different locales', () => {
    expect({
      'en-US': {
        0: formatPlural(0, 'en-US', pluralForms),
        1: formatPlural(1, 'en-US', pluralForms),
        2: formatPlural(2, 'en-US', pluralForms),
      },
      'fr-FR': {
        0: formatPlural(0, 'fr-FR', pluralForms),
        1: formatPlural(1, 'fr-FR', pluralForms),
        2: formatPlural(2, 'fr-FR', pluralForms),
      },
      'ja-JP': {
        0: formatPlural(0, 'ja-JP', pluralForms),
        1: formatPlural(1, 'ja-JP', pluralForms),
        2: formatPlural(2, 'ja-JP', pluralForms),
      },
    }).toMatchInlineSnapshot(`
      {
        "en-US": {
          "0": "many files",
          "1": "one file",
          "2": "many files",
        },
        "fr-FR": {
          "0": "one file",
          "1": "one file",
          "2": "many files",
        },
        "ja-JP": {
          "0": "many files",
          "1": "many files",
          "2": "many files",
        },
      }
    `);
  });

  it('supports locale factories with defaults', () => {
    const frFormatter = createLocaleFormatters('fr-FR', {
      date: dateOptions,
      number: { ...numberOptions, currency: 'EUR' },
    });

    expect({
      date: frFormatter.date(sampleDate),
      number: frFormatter.number(1234.56),
      plural: frFormatter.plural(0, pluralForms),
    }).toMatchInlineSnapshot(`
      {
        "date": "15/01/2023",
        "number": "1\u202f234,56\u00a0€",
        "plural": "one file",
      }
    `);
  });

  it('falls back gracefully when Intl APIs are unavailable', () => {
    const originalIntl = globalThis.Intl;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Intl = undefined;

    try {
      expect(formatDate(sampleDate, 'en-US', dateOptions)).toBe('2023-01-15T13:45:30.000Z');
      expect(formatNumber(1234.56, 'en-US', { style: 'decimal' })).toBe('1234.56');
      expect(formatPlural(1, 'en-US', pluralForms)).toBe('one file');
    } finally {
      (globalThis as any).Intl = originalIntl;
    }
  });
});
