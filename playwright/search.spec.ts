import { test, expect } from '@playwright/test';

const QUERY_COUNT = 50;
const STALL_TIMEOUT_MS = 750;
const STALL_THRESHOLD_MS = 650;

const baseTerms = [
  'calc',
  'terminal',
  'chrome',
  'notes',
  'sudoku',
  'todoist',
  'spotify',
  'weather',
  'ascii art',
  'quote',
  'hydra',
  'nessus',
  'nmap',
  'metasploit',
  'figlet',
  'gedit',
  'gallery',
  'keyboard',
  'network',
  'profile',
  'video',
  'qr tool',
  'daily',
  'hook',
  'trash',
  'pacman',
  'snake',
  'pong',
  'tetris',
  'flappy',
  'project',
  'calendar',
  'settings',
  'resource',
  'monitor',
  'converter',
  'youtube',
  'vscode',
  'apps',
  'terminal window',
  'calc app',
  'notes pad',
  'ascii',
  'qr',
  'quote generator',
  '2048',
  'sokoban',
  'simon',
  'sudoku grid',
  'word search',
];

const noiseTokens = [
  ' ',
  '  ',
  '-',
  '#',
  '!',
  '?',
  '.',
  '*',
  '/',
  '\\',
  ':',
  ';',
  ',',
  '_',
  '|',
  '~',
  '@',
  '$',
  '%',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
];

const joinTokens = [' ', ' - ', '/', ':', ' | ', '~'];

function createPrng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function maybe(random: () => number, threshold: number): boolean {
  return random() < threshold;
}

function scrambleCase(value: string, random: () => number): string {
  return value
    .split('')
    .map((char) =>
      /[a-z]/i.test(char) && maybe(random, 0.5) ? char.toUpperCase() : char.toLowerCase(),
    )
    .join('');
}

function generateQueries(count: number, seed = 0xc0ffee): string[] {
  const random = createPrng(seed);
  const queries: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const primary = pick(baseTerms, random);
    let query = primary;

    if (maybe(random, 0.45) && query.length > 3) {
      const cutoff = Math.max(1, Math.floor(random() * query.length));
      query = query.slice(0, cutoff);
    }

    if (maybe(random, 0.3)) {
      query = scrambleCase(query, random);
    }

    if (maybe(random, 0.35)) {
      const prefix = maybe(random, 0.6) ? pick(noiseTokens, random) : '';
      const suffix = maybe(random, 0.6) ? pick(noiseTokens, random) : '';
      query = `${prefix}${query}${suffix}`;
    }

    if (maybe(random, 0.25)) {
      const extra = pick(baseTerms, random);
      const joiner = pick(joinTokens, random);
      const extraCutoff = Math.max(1, Math.floor(random() * extra.length));
      query = `${query}${joiner}${extra.slice(0, extraCutoff)}`;
    }

    if (maybe(random, 0.2)) {
      const insertAt = Math.floor(random() * (query.length + 1));
      const noise = pick(noiseTokens, random);
      query = `${query.slice(0, insertAt)}${noise}${query.slice(insertAt)}`;
    }

    queries.push(query.slice(0, 40));
  }

  const fallbacks = ['', 'calc', 'terminal', 'chrome', 'notes'];
  for (let i = 0; i < fallbacks.length && i < queries.length; i += 1) {
    queries[i] = fallbacks[i];
  }

  return queries;
}

test('app search handles randomized noisy queries without stalls', async ({ page }) => {
  const consoleIssues: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];

  page.on('console', (message) => {
    const type = message.type();
    if (type !== 'warning' && type !== 'error') {
      return;
    }
    const text = message.text();
    if (
      type === 'error' &&
      (/Failed to load resource: the server responded with a status of 404/i.test(text) ||
        /\/(_vercel\/insights|_vercel\/speed-insights)\/script\.js/i.test(text))
    ) {
      return;
    }
    consoleIssues.push(`${type}: ${text}`);
  });

  page.on('pageerror', (error) => {
    const message = error.message || '';
    if (/Failed to update a ServiceWorker/i.test(message)) {
      return;
    }
    pageErrors.push(message);
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    if (/\/(_vercel\/insights|_vercel\/speed-insights)\/script\.js/i.test(url)) {
      return;
    }
    const failure = request.failure();
    requestFailures.push(`${request.method()} ${url}${failure ? ` - ${failure.errorText}` : ''}`);
  });

  await page.goto('/apps');
  const searchInput = page.getByLabel('Search apps');
  const grid = page.locator('#app-grid');

  await expect(searchInput).toBeVisible();
  await expect(grid).toBeVisible();
  await expect.poll(async () => grid.locator(':scope > *').count()).toBeGreaterThan(0);

  const queries = generateQueries(QUERY_COUNT);
  const stallReports: string[] = [];
  let queriesWithResults = 0;

  for (const query of queries) {
    const start = Date.now();
    await searchInput.fill(query);
    await expect(searchInput).toHaveValue(query, { timeout: STALL_TIMEOUT_MS });
    const duration = Date.now() - start;
    if (duration > STALL_THRESHOLD_MS) {
      stallReports.push(`${JSON.stringify(query)} took ${duration}ms`);
    }

    await page.waitForTimeout(20);
    const count = await grid.locator(':scope > *').count();
    if (count > 0) {
      queriesWithResults += 1;
    }
  }

  await searchInput.fill('');

  expect(stallReports, `Slow search responses detected:\n${stallReports.join('\n')}`).toEqual([]);
  expect(consoleIssues, `Console warnings/errors detected:\n${consoleIssues.join('\n')}`).toEqual([]);
  expect(pageErrors, `Page errors detected:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(requestFailures, `Failed network requests:\n${requestFailures.join('\n')}`).toEqual([]);
  expect(queriesWithResults).toBeGreaterThan(0);
});
