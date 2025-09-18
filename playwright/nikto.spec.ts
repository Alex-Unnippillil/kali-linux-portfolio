import { Download, Page, expect, test } from '@playwright/test';

const targets = [
  {
    host: 'demo-vuln.test',
    port: '80',
    ssl: false,
    detailPath: '/admin',
  },
  {
    host: 'demo-ssl.internal',
    port: '443',
    ssl: true,
    detailPath: '/cgi-bin/test',
  },
] as const;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Download stream was not available');
  }
  let data = '';
  for await (const chunk of stream) {
    data += chunk.toString();
  }
  return data;
}

async function exportShortcutsJson(page: Page) {
  // Make sure no input retains focus so the global shortcut can fire.
  await page.locator('#desktop').click({ position: { x: 16, y: 16 } });
  await page.keyboard.press('?');
  const overlay = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
  await expect(overlay).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    overlay.getByRole('button', { name: 'Export JSON' }).click(),
  ]);
  const jsonContent = await readDownload(download);
  const parsed = JSON.parse(jsonContent);
  expect(Array.isArray(parsed)).toBeTruthy();
  expect(parsed.length).toBeGreaterThan(0);
  await overlay.getByRole('button', { name: 'Close' }).click();
  await expect(overlay).toBeHidden();
}

test.describe('Nikto desktop workflow', () => {
  test('scans demo targets without leaking styles', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/');
    const desktop = page.locator('#desktop');
    await expect(desktop).toBeVisible({ timeout: 20000 });

    const baselineStyles = await page.evaluate(() => {
      const desktopEl = document.getElementById('desktop');
      const bodyStyle = getComputedStyle(document.body);
      const desktopStyle = desktopEl ? getComputedStyle(desktopEl) : null;
      return {
        desktopClass: desktopEl?.className ?? '',
        desktopInlineStyle: desktopEl?.getAttribute('style') ?? '',
        bodyClass: document.body.className,
        bodyInlineStyle: document.body.getAttribute('style') ?? '',
        desktopBackground: desktopStyle?.backgroundColor ?? '',
        desktopColor: desktopStyle?.color ?? '',
        bodyBackground: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
      };
    });

    await test.step('launch Nikto from the applications grid', async () => {
      await page.locator('nav[aria-label="Dock"] img[alt="Ubuntu view app"]').click();
      const allApps = page.locator('.all-apps-anim');
      await expect(allApps).toBeVisible();
      await allApps.getByLabel('Nikto', { exact: true }).dblclick();
      await expect(page.locator('#nikto')).toBeVisible();
      await expect(allApps).toBeHidden();
    });

    const niktoWindow = page.locator('#nikto');
    const commandPreview = niktoWindow.locator('pre').first();
    await expect(niktoWindow.getByRole('heading', { name: 'Nikto Scanner' })).toBeVisible();
    await expect(niktoWindow.getByRole('cell', { name: '/admin' })).toBeVisible({ timeout: 10000 });

    for (const target of targets) {
      await test.step(`scan ${target.host}`, async () => {
        const hostInput = niktoWindow.getByLabel('Host');
        const portInput = niktoWindow.getByLabel('Port');
        const sslToggle = niktoWindow.getByLabel('SSL');

        await hostInput.fill('');
        await hostInput.type(target.host);
        await portInput.fill('');
        await portInput.type(target.port);
        if (target.ssl) {
          await sslToggle.check();
        } else {
          await sslToggle.uncheck();
        }

        const expectedCommand = new RegExp(
          `nikto\\s+-h\\s+${escapeRegex(target.host)}${target.port ? `\\s+-p\\s+${escapeRegex(target.port)}` : ''}${
            target.ssl ? '\\s+-ssl' : ''
          }`,
        );
        await expect(commandPreview).toHaveText(expectedCommand);

        const [htmlDownload] = await Promise.all([
          page.waitForEvent('download'),
          niktoWindow.getByRole('button', { name: 'Export HTML' }).click(),
        ]);
        const htmlContent = await readDownload(htmlDownload);
        expect(htmlContent).toContain('<table');
        expect(htmlContent).toContain('<th>Path</th>');

        const findingRow = niktoWindow.getByRole('cell', { name: target.detailPath }).first();
        await findingRow.click();
        const detailPanel = page.locator('#nikto').locator('h3', { hasText: target.detailPath });
        await expect(detailPanel).toBeVisible();
        await page
          .locator('#nikto')
          .getByRole('button', { name: 'Close', exact: true })
          .first()
          .click();
        await expect(detailPanel).toBeHidden();

        await exportShortcutsJson(page);
      });
    }

    await test.step('close Nikto and verify desktop styling', async () => {
      await page.locator('#close-nikto').click();
      await expect(page.locator('#nikto')).toBeHidden();
      const afterStyles = await page.evaluate(() => {
        const desktopEl = document.getElementById('desktop');
        const bodyStyle = getComputedStyle(document.body);
        const desktopStyle = desktopEl ? getComputedStyle(desktopEl) : null;
        return {
          desktopClass: desktopEl?.className ?? '',
          desktopInlineStyle: desktopEl?.getAttribute('style') ?? '',
          bodyClass: document.body.className,
          bodyInlineStyle: document.body.getAttribute('style') ?? '',
          desktopBackground: desktopStyle?.backgroundColor ?? '',
          desktopColor: desktopStyle?.color ?? '',
          bodyBackground: bodyStyle.backgroundColor,
          bodyColor: bodyStyle.color,
        };
      });

      expect(afterStyles).toEqual(baselineStyles);
    });

    await exportShortcutsJson(page);

    expect(consoleErrors).toEqual([]);
  });
});
