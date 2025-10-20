const {
  createCustomRuntimeCaching,
} = require('../lib/pwa/runtimeCaching.js');

describe('PWA runtime caching configuration', () => {
  it('applies build identifiers to cache names for versioning', () => {
    const entries = createCustomRuntimeCaching({
      buildAwareCacheName: (name) => `${name}-build123`,
      normalizedBasePath: '/',
    });

    const cacheNames = entries.map((entry) => entry.options.cacheName);

    expect(cacheNames).toEqual(
      expect.arrayContaining([
        'projects-data-build123',
        'icon-assets-build123',
        'doc-pages-build123',
      ]),
    );
  });

  it('matches same-origin resources within the active base path', () => {
    const entries = createCustomRuntimeCaching({
      buildAwareCacheName: (name) => name,
      normalizedBasePath: '/portfolio',
    });

    const [projects, icons, docs] = entries;

    expect(
      projects.urlPattern({
        sameOrigin: true,
        url: new URL('https://example.com/portfolio/projects.json'),
      }),
    ).toBe(true);
    expect(
      projects.urlPattern({
        sameOrigin: true,
        url: new URL('https://example.com/projects.json'),
      }),
    ).toBe(false);

    expect(
      icons.urlPattern({
        sameOrigin: true,
        url: new URL('https://example.com/portfolio/icons/48/icon.png'),
      }),
    ).toBe(true);
    expect(
      docs.urlPattern({
        sameOrigin: true,
        url: new URL('https://example.com/portfolio/docs/apps/terminal.md'),
      }),
    ).toBe(true);

    expect(
      docs.urlPattern({
        sameOrigin: false,
        url: new URL('https://cdn.example.com/portfolio/docs/apps/terminal.md'),
      }),
    ).toBe(false);
  });

  it('uses cache strategies that allow offline hits', () => {
    const entries = createCustomRuntimeCaching({
      buildAwareCacheName: (name) => name,
      normalizedBasePath: '/',
    });

    const [projects, icons, docs] = entries;

    expect(projects.handler).toBe('NetworkFirst');
    expect(icons.handler).toBe('CacheFirst');
    expect(docs.handler).toBe('NetworkFirst');
  });
});
