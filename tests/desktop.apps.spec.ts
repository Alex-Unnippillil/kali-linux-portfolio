import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Impact = 'minor' | 'moderate' | 'serious' | 'critical' | undefined;

const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /Development mode/,
  /Refused to connect to 'home:\/\/start'/i,
  /Fetch API cannot load home:\/\/start/i,
  /\/_vercel\/(?:insights|speed-insights)\/script\.js/i,
  /Failed to load resource.*\/_vercel\/(?:insights|speed-insights)\/script\.js/i,
  /net::ERR_ABORTED 404.*\/_vercel\/(?:insights|speed-insights)\/script\.js/i,
  /net::ERR_CERT_AUTHORITY_INVALID/i,
];

const IGNORED_PAGE_ERRORS: RegExp[] = [
  /Failed to update a ServiceWorker/i,
];

const A11Y_EXCEPTION_ALLOWLIST: Record<string, string[]> = {
  'Settings window': ['label', 'select-name'],
  'Google Chrome window': ['label'],
};

function shouldIgnoreConsoleMessage(message: ConsoleMessage): boolean {
  const text = message.text();
  const url = message.location().url || '';
  return IGNORED_CONSOLE_PATTERNS.some(
    (pattern) => pattern.test(text) || (url && pattern.test(url)),
  );
}

async function expectNoSeriousViolations(page: Page, include: string, context: string) {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .include(include)
    .exclude(`${include} iframe`);

  const results = await builder.analyze();
  const seriousOrCritical = results.violations.filter((violation) => {
    const impact = violation.impact as Impact;
    return impact === 'serious' || impact === 'critical';
  });

  const allowedIds = new Set(A11Y_EXCEPTION_ALLOWLIST[context] ?? []);
  const unexpected = seriousOrCritical.filter((violation) => !allowedIds.has(violation.id));

  const allowed = seriousOrCritical.filter((violation) => allowedIds.has(violation.id));
  if (allowed.length > 0) {
    console.warn(
      `Allowed accessibility issues in ${context}: ${allowed.map((v) => v.id).join(', ')}`,
    );
  }

  const formatted = unexpected
    .map((violation) => `${violation.id} (${violation.nodes.length} nodes)`)
    .join('\n');

  expect(
    unexpected,
    `Serious accessibility issues in ${context}:\n${formatted}`,
  ).toEqual([]);
}

function formatConsoleMessage(type: string, text: string, url?: string, line?: number, column?: number) {
  const location = url ? ` @ ${url}${line ? `:${line}` : ''}${column ? `:${column}` : ''}` : '';
  return `${type.toUpperCase()}: ${text}${location}`;
}

test.describe('Desktop essential apps', () => {
  test('launches desktop and opens key apps without console issues', async ({ page }) => {
    test.setTimeout(180_000);
    const consoleIssues: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      const type = message.type();
      if (type !== 'warning' && type !== 'error') {
        return;
      }

      if (shouldIgnoreConsoleMessage(message)) {
        return;
      }

      const text = message.text();
      const { url, lineNumber, columnNumber } = message.location();
      consoleIssues.push(formatConsoleMessage(type, text, url, lineNumber, columnNumber));
    });

    page.on('pageerror', (error) => {
      if (IGNORED_PAGE_ERRORS.some((pattern) => pattern.test(error.message))) {
        console.warn(`Ignored page error: ${error.message}`);
        return;
      }
      pageErrors.push(`PAGE ERROR: ${error.message}`);
    });

    await page.goto('/');
    const desktop = page.locator('#desktop');
    await desktop.waitFor({ state: 'attached', timeout: 120_000 });

    const dock = page.getByRole('navigation', { name: 'Dock' });
    await dock.waitFor({ state: 'visible', timeout: 120_000 });

    await expectNoSeriousViolations(page, '#desktop', 'desktop shell');

    const apps = [
      { id: 'terminal', name: 'Terminal', buttonName: 'Terminal' },
      { id: 'settings', name: 'Settings', buttonName: 'Settings' },
      { id: 'chrome', name: 'Google Chrome', buttonName: 'Google Chrome' },
    ];

    for (const app of apps) {
      await test.step(`open ${app.name}`, async () => {
        await dock.getByRole('button', { name: app.buttonName }).click();
        const window = page.getByRole('dialog', { name: app.name });
        await expect(window).toBeVisible();
        await expect(page.locator(`#${app.id}`)).toBeVisible();
        await expectNoSeriousViolations(page, `#${app.id}`, `${app.name} window`);
      });
    }

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
    expect(consoleIssues, consoleIssues.join('\n')).toEqual([]);
  });
});
