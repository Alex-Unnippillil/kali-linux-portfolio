import {
  ATTRIBUTION_STORAGE_KEY,
  ATTRIBUTION_TTL_MS,
  clearAttributionSession,
  getAttributionMetadata,
  initAttributionSession,
  readAttributionSession,
} from '../utils/attribution';

const baseLocation = {
  href: 'https://portfolio.test/apps?utm_source=google&utm_medium=cpc&utm_campaign=spring',
  search: '?utm_source=google&utm_medium=cpc&utm_campaign=spring',
  pathname: '/apps',
  hash: '',
};

const secondLocation = {
  href: 'https://portfolio.test/apps?utm_source=bing&utm_medium=organic',
  search: '?utm_source=bing&utm_medium=organic',
  pathname: '/apps',
  hash: '',
};

const setDoNotTrack = (value?: string): void => {
  const descriptor = { configurable: true, enumerable: true, writable: true } as const;
  if (value === undefined) {
    delete (window as Window & { doNotTrack?: string }).doNotTrack;
    delete (navigator as Navigator & { doNotTrack?: string }).doNotTrack;
    delete (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
    return;
  }
  Object.defineProperty(window, 'doNotTrack', { ...descriptor, value });
  Object.defineProperty(navigator, 'doNotTrack', { ...descriptor, value });
};

describe('attribution session', () => {
  const now = 1_700_000_000_000;

  beforeEach(() => {
    localStorage.clear();
    clearAttributionSession();
    setDoNotTrack(undefined);
  });

  it('stores UTM parameters, referrer, and expiry for 90 days', () => {
    initAttributionSession({
      location: baseLocation,
      referrer: 'https://ref.example',
      now,
      respectDNT: false,
    });

    const stored = readAttributionSession(now);
    expect(stored).toEqual({
      utm: {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'spring',
      },
      referrer: 'https://ref.example',
      landingPage: baseLocation.href,
      createdAt: now,
      expiresAt: now + ATTRIBUTION_TTL_MS,
    });

    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now + 10);
    expect(getAttributionMetadata()).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'spring',
      referrer: 'https://ref.example',
      landingPage: baseLocation.href,
    });
    dateSpy.mockRestore();
  });

  it('expires stored attribution after 90 days', () => {
    initAttributionSession({
      location: baseLocation,
      referrer: 'https://ref.example',
      now,
      respectDNT: false,
    });

    const expired = readAttributionSession(now + ATTRIBUTION_TTL_MS + 1);
    expect(expired).toBeUndefined();
    expect(localStorage.getItem(ATTRIBUTION_STORAGE_KEY)).toBeNull();
  });

  it('overrides attribution when new UTM parameters arrive', () => {
    initAttributionSession({
      location: baseLocation,
      referrer: 'https://ref.example',
      now,
      respectDNT: false,
    });

    const updated = initAttributionSession({
      location: secondLocation,
      referrer: 'https://another.referrer',
      now: now + 1,
      respectDNT: false,
    });

    expect(updated).toEqual({
      utm: {
        utm_source: 'bing',
        utm_medium: 'organic',
      },
      referrer: 'https://another.referrer',
      landingPage: secondLocation.href,
      createdAt: now + 1,
      expiresAt: now + 1 + ATTRIBUTION_TTL_MS,
    });
  });

  it('respects Do Not Track by skipping and clearing storage', () => {
    // Seed a session first.
    initAttributionSession({
      location: baseLocation,
      referrer: 'https://ref.example',
      now,
      respectDNT: false,
    });
    expect(readAttributionSession(now)).toBeDefined();

    setDoNotTrack('1');

    const result = initAttributionSession({
      location: secondLocation,
      now: now + 10,
    });

    expect(result).toBeUndefined();
    expect(localStorage.getItem(ATTRIBUTION_STORAGE_KEY)).toBeNull();
  });
});
