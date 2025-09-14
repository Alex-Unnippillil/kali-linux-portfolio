import { pickMirror } from '../pages/api/mirror';

describe('pickMirror', () => {
  const mirrors = {
    a: { url: 'http://a', country: 'US', distance: 1000 },
    b: { url: 'http://b', country: 'DE', distance: 10 },
    c: { url: 'http://c', country: 'US', distance: 5 },
  };

  test('selects mirror matching country', () => {
    const geo = { country: 'US' };
    const m = pickMirror(geo, mirrors);
    expect(m.url).toBe('http://c');
  });

  test('falls back to closest distance', () => {
    const geo = { country: 'FR' };
    const m = pickMirror(geo, mirrors);
    expect(m.url).toBe('http://c');
  });
});
