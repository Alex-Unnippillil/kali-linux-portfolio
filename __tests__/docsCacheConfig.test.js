/**
 * @jest-environment node
 */

const path = require('path');
const {
  buildDocsJsonHeaders,
  createDocsJsonRuntimeCaching,
} = require('../lib/docsCacheConfig.js');

describe('docs/json cache configuration', () => {
  const projectRoot = path.join(__dirname, '..');

  test('emits Cache-Control with stale-while-revalidate and an ETag for docs', () => {
    const headers = buildDocsJsonHeaders({ projectRoot });
    const docEntry = headers.find((entry) =>
      entry.source.endsWith('/docs/apps/terminal.md'),
    );
    expect(docEntry).toBeDefined();
    expect(docEntry.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'Cache-Control',
          value: expect.stringContaining('stale-while-revalidate'),
        }),
        expect.objectContaining({
          key: 'ETag',
          value: expect.stringMatching(/^"[a-f0-9]+"$/),
        }),
      ]),
    );
  });

  test('emits Cache-Control with stale-while-revalidate and an ETag for JSON', () => {
    const headers = buildDocsJsonHeaders({ projectRoot });
    const jsonEntry = headers.find((entry) => entry.source.endsWith('/projects.json'));
    expect(jsonEntry).toBeDefined();
    expect(jsonEntry.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'Cache-Control',
          value: expect.stringContaining('stale-while-revalidate'),
        }),
        expect.objectContaining({
          key: 'ETag',
          value: expect.stringMatching(/^"[a-f0-9]+"$/),
        }),
      ]),
    );
  });

  test('runtime caching uses stale-while-revalidate handler', () => {
    const cacheEntry = createDocsJsonRuntimeCaching({ cacheName: 'docs-json-test' });
    expect(cacheEntry.handler).toBe('StaleWhileRevalidate');

    const docUrl = new URL('https://example.com/docs/apps/terminal.md');
    const jsonUrl = new URL('https://example.com/projects.json');
    const dataUrl = new URL('https://example.com/_next/data/build/index.json');

    expect(cacheEntry.urlPattern({ sameOrigin: true, url: docUrl })).toBe(true);
    expect(cacheEntry.urlPattern({ sameOrigin: true, url: jsonUrl })).toBe(true);
    expect(cacheEntry.urlPattern({ sameOrigin: true, url: dataUrl })).toBe(false);
  });
});
