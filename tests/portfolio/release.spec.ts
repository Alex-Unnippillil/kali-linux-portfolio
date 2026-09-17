import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

async function screenshot(page: Page, name: string) {
  await mkdir('portfolio-screenshots', { recursive: true });
  await page.screenshot({ path: `portfolio-screenshots/${name}.png`, animations: 'disabled' });
}
async function desktop(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('#desktop')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#about')).toBeVisible();
}
async function openApp(page: Page, title: string, id: string) {
  await page.getByRole('button', { name: 'Applications menu', exact: true }).click();
  const menu = page.getByTestId('whisker-menu-dropdown');
  await menu.getByRole('searchbox', { name: 'Search applications' }).fill(title);
  await menu.getByTestId('whisker-menu-app-list').getByRole('button', { name: title, exact: true }).click();
  await expect(page.locator(`#${id}`)).toBeVisible();
}
async function closeWindow(page: Page, id: string) {
  await page.locator(`#${id}`).getByRole('button', { name: 'Window close', exact: true }).click();
  await expect(page.locator(`#${id}`)).toHaveCount(0);
}
const sizes = [[360,800], [390,844], [844,390], [768,1024], [1366,768], [1440,900], [1920,1080], [2560,1080]];
for (const [width,height] of sizes) {
  test(`Kali desktop fits ${width}x${height}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height }, hasTouch: width < 1024 });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await desktop(page);
      await expect(page.locator('#about').getByText('My name is', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Enter the desktop', exact: true })).toHaveCount(0);
      await screenshot(page, `desktop-${width}x${height}`);
      const rect = await page.locator('#about').boundingBox();
      expect(rect).not.toBeNull();
      expect(rect!.x).toBeGreaterThanOrEqual(-1);
      expect(rect!.y).toBeGreaterThanOrEqual(40);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width + 1);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(height + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width < 640 || (width < 1024 && height < 500)) {
        await expect(page.locator('#about')).toHaveAttribute('data-window-compact', 'true');
        await expect(page.locator('#about').getByRole('button', { name: 'Window maximize', exact: true })).toBeDisabled();
        await expect(page.locator('#about').getByRole('button', { name: 'Window close', exact: true })).toBeInViewport();
        await openApp(page, 'Project Gallery', 'project-gallery');
        await page.locator('#project-gallery').getByRole('searchbox', { name: 'Find a project' }).fill('crawler');
        await page.locator('#project-gallery').getByRole('button', { name: 'Web Crawler Studio', exact: true }).click();
        await expect(page.locator('#project-gallery').getByRole('heading', { name: 'Architecture', exact: true })).toBeVisible();
        await screenshot(page, `projects-${width}x${height}`);
      }
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}

test('first and returning visits open the OS, including old overview URLs', async ({ page }) => {
  await desktop(page);
  await page.evaluate(() => localStorage.setItem('kali-portfolio:entry', 'overview'));
  await desktop(page, '/?overview=1');
  await expect(page.getByRole('button', { name: 'Portfolio overview', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#about')).toBeVisible();
});

test('launcher, native project details and direct project routes preserve the OS', async ({ page }) => {
  await desktop(page);
  await openApp(page, 'Project Gallery', 'project-gallery');
  const gallery = page.locator('#project-gallery');
  await gallery.getByRole('button', { name: 'Featured', exact: true }).click();
  await expect(gallery.getByRole('button', { name: 'GPT Researcher · fork', exact: true })).toHaveCount(0);
  await gallery.getByRole('button', { name: 'Open source', exact: true }).click();
  await expect(gallery.getByRole('button', { name: 'GPT Researcher · fork', exact: true })).toBeVisible();
  await gallery.getByRole('searchbox').fill('no-such-project');
  await expect(gallery.getByText('No matching projects')).toBeVisible();
  await gallery.getByRole('button', { name: 'Clear search and filters' }).click();
  await gallery.getByRole('searchbox').fill('crawler');
  await gallery.getByRole('button', { name: 'Web Crawler Studio', exact: true }).click();
  await expect(gallery.getByRole('heading', { name: 'Architecture', exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  await screenshot(page, 'native-project-detail');
  await gallery.getByRole('button', { name: /Back to projects/ }).click();
  await expect(gallery.getByRole('searchbox')).toHaveValue('crawler');
  await expect(gallery.getByRole('button', { name: 'Web Crawler Studio', exact: true })).toBeFocused();
  await page.goto('/projects/web-crawler');
  await expect(page.locator('#desktop')).toBeVisible();
  await expect(page.locator('#project-gallery').getByRole('heading', { name: 'Web Crawler Studio', exact: true })).toBeVisible();
});

test('window controls, moving, focus and desktop resize remain functional', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await desktop(page);
  await closeWindow(page, 'about');
  await openApp(page, 'Project Gallery', 'project-gallery');
  const frame = page.locator('#project-gallery');
  const search = frame.getByRole('searchbox', { name: 'Find a project' });
  await search.fill('crawler');
  await expect(search).toBeFocused();
  const before = await frame.boundingBox();
  const bar = await frame.locator('[data-window-titlebar]').boundingBox();
  await page.mouse.move(bar!.x + bar!.width / 2, bar!.y + 20);
  await page.mouse.down(); await page.mouse.move(bar!.x + bar!.width / 2 + 75, bar!.y + 75, { steps:8 }); await page.mouse.up();
  await expect.poll(async () => (await frame.boundingBox())!.x).not.toBe(before!.x);
  await frame.getByRole('button', { name:'Window maximize', exact:true }).click();
  await expect(frame).toHaveAttribute('data-window-state','maximized');
  await frame.getByRole('button', { name:'Restore window size', exact:true }).click();
  await expect(frame).toHaveAttribute('data-window-state','active');
  await frame.getByRole('button', { name:'Window minimize', exact:true }).click();
  await expect(frame).toHaveAttribute('aria-hidden','true');
  await page.locator('[data-context="taskbar"][data-app-id="project-gallery"]').first().click();
  await expect(frame).toHaveAttribute('aria-hidden','false');
  await expect(search).toHaveValue('crawler');
  await page.setViewportSize({ width:1024, height:600 });
  await expect.poll(async () => { const b=await frame.boundingBox(); return Math.round(b!.x+b!.width); }).toBeLessThanOrEqual(1025);
  await expect.poll(async () => { const b=await frame.boundingBox(); return Math.round(b!.y+b!.height); }).toBeLessThanOrEqual(601);
  await screenshot(page,'resized-desktop');
  await closeWindow(page,'project-gallery');
});

test('About sections, settings and contact remain native applications', async ({ page }) => {
  await desktop(page);
  const about = page.locator('#about');
  // The native About application retains its original section navigation.
  await about.getByRole('button', { name:'Projects', exact:true }).click();
  await expect(about.getByRole('searchbox', { name:'Find a project' })).toBeVisible();
  await openApp(page,'Settings','settings');
  await screenshot(page,'settings-window');
  await closeWindow(page,'settings');
  await openApp(page,'Contact','contact');
  await expect(page.locator('#contact').getByRole('link', { name:'Email Alex', exact:true })).toHaveAttribute('href','mailto:alex.unnippillil@hotmail.com');
  await page.locator('#contact').getByLabel('Name',{ exact:true }).fill('Keyboard visitor');
  await expect(page.locator('#contact').getByLabel('Name',{ exact:true })).toBeFocused();
  await screenshot(page,'contact-window');
});

test('native-window accessibility and keyboard launcher', async ({ page }, testInfo) => {
  await desktop(page);
  await closeWindow(page,'about');
  const launcher = page.getByRole('button', { name:'Applications menu', exact:true });
  await launcher.focus(); await page.keyboard.press('Enter');
  const menu = page.getByTestId('whisker-menu-dropdown');
  await expect(menu.getByRole('searchbox')).toBeFocused();
  await menu.getByRole('searchbox').fill('Project Gallery');
  await screenshot(page,'launcher-keyboard');
  await page.keyboard.press('Enter');
  await expect(page.locator('#project-gallery')).toBeVisible();
  const results = await new AxeBuilder({page}).include('#project-gallery').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  await testInfo.attach('window-accessibility',{body:JSON.stringify(results.violations,null,2),contentType:'application/json'});
  expect(results.violations).toEqual([]);
});

test('static/no-JavaScript fallback is readable but is not the default UI', async ({ browser,baseURL }) => {
  const context = await browser.newContext({javaScriptEnabled:false,baseURL});
  try {
    const page=await context.newPage();
    for(const route of ['/','/about','/projects','/projects/web-crawler','/contact']) {
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.locator('main h1')).toBeVisible();
    }
  } finally { await context.close(); }
});

test('reduced motion and real 404 status', async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await desktop(page);
  await screenshot(page,'desktop-reduced-motion');
  expect((await page.goto('/this-project-does-not-exist'))?.status()).toBe(404);
});

test.afterEach(async ({page},testInfo)=>{
  if(testInfo.status!==testInfo.expectedStatus) {
    await mkdir('portfolio-screenshots',{recursive:true});
    await writeFile(`portfolio-screenshots/failure-${testInfo.testId}.txt`,await page.locator('body').innerText().catch(()=>''));
  }
});
