import {
  FALLBACK_LOCALE,
  createMessageFormatter,
  defaultCatalogs,
  getMessageFormatter,
} from '../i18n/message';

describe('ICU message formatting', () => {
  it('formats pluralised trash day strings across locales', () => {
    const counts = [0, 1, 2, 5];
    const locales = ['en', 'es', 'fr'];
    const formatted = Object.fromEntries(
      locales.map((locale) => {
        const formatter = createMessageFormatter({
          locale,
          fallbackLocale: FALLBACK_LOCALE,
          catalogs: defaultCatalogs,
        });
        return [
          locale,
          counts.map((count) =>
            formatter.format('trash.daysRemaining', { count }),
          ),
        ];
      }),
    );

    expect(formatted).toMatchSnapshot();
  });

  it('supports gender aware selections', () => {
    const english = getMessageFormatter('en');
    const spanish = getMessageFormatter('es');

    const samples = {
      enMale: english.format('trash.genderedActor', {
        gender: 'male',
        name: 'Alex',
        count: 2,
      }),
      enFemale: english.format('trash.genderedActor', {
        gender: 'female',
        name: 'Riley',
        count: 1,
      }),
      enNeutral: english.format('trash.genderedActor', {
        gender: 'other',
        name: 'Sam',
        count: 3,
      }),
      esNeutral: spanish.format('trash.genderedActor', {
        gender: 'other',
        name: 'Mar',
        count: 4,
      }),
    };

    expect(samples).toMatchSnapshot();
  });

  it('falls back to the default locale for missing translations', () => {
    const formatter = getMessageFormatter('fr');
    expect(formatter.resolvedLocale).toBe('en');
    expect(
      formatter.format('youtube.playlistCount', { count: 3 })
    ).toBe('3 playlists');
  });
});
