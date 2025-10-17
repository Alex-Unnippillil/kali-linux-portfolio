const openTerminal = require('./a11y-open-terminal');

module.exports = async (page) => {
  const ensureDesktopContext = openTerminal.ensureDesktopContext || (async () => false);
  if (!(await ensureDesktopContext(page))) {
    return;
  }

  await openTerminal(page);

  const titleBarSelector = '[role="dialog"][aria-label="Terminal"] .bg-ub-window-title';
  const titleBar = await page.waitForSelector(titleBarSelector, { timeout: 10000 });
  if (!titleBar) {
    return;
  }

  const box = await titleBar.boundingBox();
  if (!box) {
    return;
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(120);

  const dragY = Math.min(startY + 200, box.y + box.height + 220);
  await page.mouse.move(startX, dragY, { steps: 15 });
  await page.mouse.move(24, dragY, { steps: 20 });

  await page.waitForSelector('[data-testid="snap-preview"]', { timeout: 2000 }).catch(() => {});
};
