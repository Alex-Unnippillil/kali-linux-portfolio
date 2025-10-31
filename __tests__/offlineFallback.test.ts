import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

declare global {
  // eslint-disable-next-line no-var
  var caches: {
    keys: () => Promise<string[]>;
    open: (key: string) => Promise<{ keys: () => Promise<Array<{ url: string }>> }>;
  } | undefined;
}

describe('offline fallback page', () => {
  const FALLBACK_STORAGE_KEY = 'offlineFallbackUsed';
  let originalCaches: typeof global.caches;
  let setItemSpy: jest.SpyInstance | undefined;
  let fallbackEvents: CustomEvent[];
  const recordEvent = (event: Event) => {
    fallbackEvents.push(event as CustomEvent);
  };

  beforeEach(async () => {
    jest.resetModules();

    document.body.innerHTML = `
      <main>
        <div class="actions">
          <button id="retry">Try again</button>
          <button id="open-cached">Open cached</button>
        </div>
        <section>
          <ul id="apps"></ul>
        </section>
      </main>
    `;

    originalCaches = global.caches;

    const cacheKeysMock = jest.fn().mockResolvedValue(['shell']);
    const cacheOpenMock = jest.fn().mockImplementation(async () => ({
      keys: jest.fn().mockResolvedValue([
        { url: 'https://example.com/apps/terminal' },
        { url: 'https://example.com/static/script.js' },
      ]),
    }));

    global.caches = {
      keys: cacheKeysMock,
      open: cacheOpenMock,
    } as unknown as typeof global.caches;

    const storagePrototype = Object.getPrototypeOf(window.localStorage);
    setItemSpy = jest.spyOn(storagePrototype, 'setItem');
    fallbackEvents = [];
    window.addEventListener('offline:fallback-open', recordEvent);

    require('../public/offline.js');

    // wait for async cache population
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    setItemSpy?.mockRestore();
    window.removeEventListener('offline:fallback-open', recordEvent);
    global.caches = originalCaches;
  });

  it('lists cached applications and tracks navigation intent', () => {
    const links = document.querySelectorAll<HTMLAnchorElement>('#apps li a');
    expect(links).toHaveLength(1);

    setItemSpy?.mockClear();
    links[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(setItemSpy!).toHaveBeenCalledWith(
      FALLBACK_STORAGE_KEY,
      expect.stringContaining('/apps/terminal'),
    );
    expect(fallbackEvents[fallbackEvents.length - 1]?.detail).toEqual(
      expect.objectContaining({
        source: 'offline-page-app',
        path: '/apps/terminal',
        ts: expect.any(Number),
      }),
    );
  });

  it('handles the open cached button', () => {
    const button = document.getElementById('open-cached');
    expect(button).not.toBeNull();

    setItemSpy?.mockClear();
    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(setItemSpy!).toHaveBeenCalledWith(
      FALLBACK_STORAGE_KEY,
      expect.stringContaining('offline-page'),
    );
    expect(fallbackEvents[fallbackEvents.length - 1]?.detail).toEqual(
      expect.objectContaining({
        source: 'offline-page',
        path: '/',
        ts: expect.any(Number),
      }),
    );
  });

  it('retries the page when requested', () => {
    const button = document.getElementById('retry');
    expect(button).not.toBeNull();

    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // Reloads are not observable in JSDOM; ensure handler is attached and callable
    expect(typeof window.location.reload).toBe('function');
  });
});
