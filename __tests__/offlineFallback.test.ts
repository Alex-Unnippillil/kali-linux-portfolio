import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

import { offlineGuidanceFor } from '../utils/createDynamicApp';

describe('offline fallback content', () => {
  const offlineHtmlPath = path.join(process.cwd(), 'public', 'offline.html');

  test('offline page exposes cached app and suggestion regions', () => {
    const html = fs.readFileSync(offlineHtmlPath, 'utf8');
    const dom = new JSDOM(html);
    const { document } = dom.window;

    expect(document.getElementById('retry')).not.toBeNull();
    expect(document.getElementById('apps')).not.toBeNull();
    expect(document.getElementById('suggestion-groups')).not.toBeNull();
    expect(document.querySelector('section.card')).not.toBeNull();
    expect(document.getElementById('offline-status')).not.toBeNull();
  });

  test('runtime populates cached apps and tailored suggestions', async () => {
    jest.resetModules();
    const html = fs.readFileSync(offlineHtmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'https://portfolio.local/offline.html' });

    const cacheEntries = new Map<string, string[]>([
      ['runtime-cache', [
        'https://portfolio.local/apps/terminal',
        'https://portfolio.local/apps/checkers',
        'https://portfolio.local/apps/weather',
        'https://portfolio.local/assets/logo.png',
      ]],
      ['misc-cache', ['https://portfolio.local/offline.html']],
    ]);

    const cachesMock = {
      keys: jest.fn(async () => Array.from(cacheEntries.keys())),
      open: jest.fn(async (name: string) => ({
        keys: jest.fn(async () =>
          (cacheEntries.get(name) || []).map((url) => ({ url }))
        ),
      })),
    } as unknown as CacheStorage;

    require('../public/offline.js');
    const runtime = (globalThis as typeof globalThis & { __OFFLINE_PAGE__?: any }).__OFFLINE_PAGE__;
    expect(runtime).toBeDefined();

    const cachedApps = await runtime.collectCachedApps(cachesMock);
    expect(cachedApps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'terminal', category: 'tools' }),
        expect.objectContaining({ slug: 'checkers', category: 'games' }),
        expect.objectContaining({ slug: 'weather', category: 'reference' }),
      ]),
    );

    const appList = dom.window.document.getElementById('apps');
    runtime.renderCachedApps(appList, cachedApps);
    const appLabels = Array.from(dom.window.document.querySelectorAll('#apps a')).map(
      (node) => node.textContent || '',
    );
    expect(appLabels).toEqual(
      expect.arrayContaining(['Terminal', 'Checkers', 'Weather Dashboard'])
    );

    const suggestionContainer = dom.window.document.getElementById('suggestion-groups');
    runtime.renderSuggestions(
      suggestionContainer,
      new Set(cachedApps.map((app: { category: string }) => app.category)),
    );
    const suggestionHeadings = Array.from(
      suggestionContainer?.querySelectorAll('h3') ?? [],
    ).map((node) => node.textContent || '');
    expect(suggestionHeadings.length).toBeGreaterThanOrEqual(3);
    expect(suggestionHeadings.some((text) => /offline/i.test(text))).toBe(true);
    expect(suggestionHeadings.some((text) => /arcade/i.test(text))).toBe(true);

    const configPath = require.resolve('../next.config.js');
    const configSource = fs.readFileSync(configPath, 'utf8');
    expect(configSource).toEqual(expect.stringContaining('/offline.html'));
    expect(configSource).toEqual(expect.stringContaining('/offline.js'));
    expect(configSource).toEqual(expect.stringContaining('/offline.css'));
  });
});

describe('offline guidance heuristics', () => {
  test('maps tools to productivity guidance', () => {
    expect(offlineGuidanceFor('terminal').category).toBe('tools');
    expect(offlineGuidanceFor('sticky_notes').heading).toMatch(/offline recon/i);
  });

  test('maps games to arcade guidance', () => {
    const guidance = offlineGuidanceFor('checkers');
    expect(guidance.category).toBe('games');
    expect(guidance.heading).toMatch(/arcade/i);
  });

  test('defaults to reference guidance for research apps', () => {
    const guidance = offlineGuidanceFor('security-tools');
    expect(guidance.category).toBe('reference');
    expect(guidance.heading).toMatch(/intelligence/i);
  });
});
