import { expect, test } from '@playwright/test';

async function bootDesktop(page) {
  await page.goto('/');
  await page.waitForSelector('#desktop');
  await page.evaluate(() => {
    const win =
      document.getElementById('about-alex') || document.getElementById('about');
    if (win) {
      win.style.transform = 'translate(620px, 40px)';
    }
  });
}

async function openApp(page, appId: string) {
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
  }, appId);
  await page.waitForSelector(`#${appId}`, { state: 'visible' });
}

test.describe('cross-application drag-and-drop', () => {
  test('drags demo text file to Hash Converter', async ({ page }) => {
    await bootDesktop(page);
    await openApp(page, 'files');
    await openApp(page, 'converter');

    await page.waitForSelector('[data-testid="file-explorer-demo"][data-name="common.txt"]');
    await page.evaluate(() => {
      const files = document.getElementById('files');
      const converter = document.getElementById('converter');
      if (files) files.style.transform = 'translate(80px, 140px)';
      if (converter) converter.style.transform = 'translate(460px, 120px)';
    });

    const source = page.locator('[data-testid="file-explorer-demo"][data-name="common.txt"]');
    const target = page.locator('#converter [data-testid="hash-dropzone"]');
    await source.dragTo(target);

    await expect(page.locator('#converter').getByText('File: common.txt')).toBeVisible();
  });

  test('drags demo pcap file to Wireshark', async ({ page }) => {
    await bootDesktop(page);
    await openApp(page, 'files');
    await openApp(page, 'wireshark');

    await page.waitForSelector('[data-testid="file-explorer-demo"][data-name="dns.pcap"]');
    await page.evaluate(() => {
      const files = document.getElementById('files');
      const wireshark = document.getElementById('wireshark');
      if (files) files.style.transform = 'translate(40px, 140px)';
      if (wireshark) wireshark.style.transform = 'translate(420px, 60px)';
    });

    const source = page.locator('[data-testid="file-explorer-demo"][data-name="dns.pcap"]');
    const target = page.locator('[data-testid="wireshark-app"]');
    await source.dragTo(target);

    await expect(page.locator('#wireshark tbody tr').first()).toBeVisible();
  });

  test('drops app icon into clipboard manager', async ({ page }) => {
    await bootDesktop(page);
    await openApp(page, 'clipboard-manager');

    await page.evaluate(() => {
      const clipboard = document.getElementById('clipboard-manager');
      if (clipboard) clipboard.style.transform = 'translate(420px, 180px)';
    });

    const appIcon = page.locator('#app-chrome');
    await expect(appIcon).toBeVisible();

    const dropzone = page.locator('#clipboard-manager [data-testid="clipboard-dropzone"]');
    await appIcon.dragTo(dropzone);

    await expect(
      page.locator('#clipboard-manager').getByText('[App] Google Chrome (chrome)'),
    ).toBeVisible();
  });
});
