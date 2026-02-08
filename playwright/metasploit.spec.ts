import { expect, Page, test } from '@playwright/test';

const MODULES_TO_OPEN = 20;
const DOM_TOLERANCE = 20;

const getNodeCount = (page: Page) =>
  page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
    );
    let count = 0;
    while (walker.nextNode()) {
      count += 1;
    }
    return count;
  });

test.describe('Metasploit desktop integration', () => {
  test('opens modules, filters, searches, and closes without leaks', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2500);
    await page.waitForSelector('#window-area');

    const baselineNodeCount = await getNodeCount(page);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'metasploit' }));
    });

    const metasploitWindow = page.locator('#metasploit');
    await expect(metasploitWindow).toBeVisible();

    const moduleButtons = metasploitWindow.locator(
      '.grid.grid-cols-2 button:has(.font-mono)',
    );
    const moduleCount = await moduleButtons.count();
    expect(moduleCount).toBeGreaterThanOrEqual(MODULES_TO_OPEN);

    const moduleHeading = metasploitWindow.locator('aside.bg-ub-grey h3');
    const openedModules = new Set<string>();
    for (let index = 0; index < MODULES_TO_OPEN; index += 1) {
      const button = moduleButtons.nth(index);
      const name = (await button.locator('.font-mono').innerText()).trim();
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await expect(moduleHeading).toContainText(name);
      openedModules.add(name);
    }
    expect(openedModules.size).toBeGreaterThanOrEqual(MODULES_TO_OPEN);

    const severityButtons = metasploitWindow.locator('button[aria-pressed]');
    const severityCount = await severityButtons.count();
    expect(severityCount).toBeGreaterThan(0);

    let hadModulesWhileSwitching = false;
    for (let i = 0; i < severityCount; i += 1) {
      const button = severityButtons.nth(i);
      const label = (await button.innerText()).trim();
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');

      for (let j = 0; j < severityCount; j += 1) {
        const otherButton = severityButtons.nth(j);
        if (j === i) continue;
        await expect(otherButton).toHaveAttribute('aria-pressed', 'false');
      }

      const countForSeverity = await moduleButtons.count();
      if (countForSeverity > 0) {
        hadModulesWhileSwitching = true;
        const severityBadge = moduleButtons
          .first()
          .locator('span')
          .first();
        await expect(severityBadge).toHaveText(new RegExp(label, 'i'));
      }
    }
    expect(hadModulesWhileSwitching).toBeTruthy();

    const searchInput = metasploitWindow.locator(
      'input[placeholder="Search modules"]',
    ).first();
    await searchInput.fill('2wire');
    const searchResults = metasploitWindow.locator('ul.max-h-40 li');
    expect(await searchResults.count()).toBeGreaterThan(0);
    await expect(searchResults.first()).toContainText(/2wire/i);

    await searchInput.focus();
    const latencyPromise = page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[placeholder="Search modules"]',
      );
      if (!input) {
        throw new Error('Search input not found');
      }
      return new Promise<number>((resolve) => {
        const start = performance.now();
        const handler = (event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            resolve(performance.now() - start);
          }
        };
        input.addEventListener('keydown', handler, { once: true });
      });
    });

    await page.keyboard.press('Enter');
    const inputLatency = await latencyPromise;
    expect(inputLatency).toBeLessThanOrEqual(100);

    const nodeCountBeforeClose = await getNodeCount(page);

    await metasploitWindow.locator('button[aria-label="Window close"]').click();
    await expect(page.locator('#metasploit')).toHaveCount(0);

    const finalNodeCount = await getNodeCount(page);
    expect(finalNodeCount).toBeLessThanOrEqual(nodeCountBeforeClose);
    expect(Math.abs(finalNodeCount - baselineNodeCount)).toBeLessThanOrEqual(
      DOM_TOLERANCE,
    );

    expect(consoleErrors).toEqual([]);
  });
});
