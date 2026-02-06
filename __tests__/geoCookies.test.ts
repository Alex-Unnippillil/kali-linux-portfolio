import { deriveCookies } from '../utils/geoCookies';

describe('deriveCookies', () => {
  it('returns locale and mirror from country', () => {
    expect(deriveCookies('DE')).toEqual({ preferredMirror: 'de', locale: 'en-DE' });
  });

  it('falls back when country missing', () => {
    expect(deriveCookies()).toEqual({ preferredMirror: 'global', locale: 'en-US' });
  });
});
