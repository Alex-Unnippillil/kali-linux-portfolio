const openTerminal = require('./a11y-open-terminal');
const closeTerminal = require('./a11y-close-terminal');

module.exports = async (page) => {
  const ensureDesktopContext = openTerminal.ensureDesktopContext || (async () => false);
  if (!(await ensureDesktopContext(page))) {
    return;
  }

  try {
    await page.mouse.up();
  } catch (error) {
    // Ignore if mouse was not pressed
  }

  const dialogSelector = '[role="dialog"][aria-label="Terminal"]';
  const hasDialog = await page.$(dialogSelector);
  if (hasDialog) {
    await page.focus(dialogSelector).catch(() => {});
    await page.keyboard.down('Alt').catch(() => {});
    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.keyboard.up('Alt').catch(() => {});
    await page.waitForTimeout(150);
  }

  await page.waitForSelector('[data-testid="snap-preview"]', { hidden: true, timeout: 2000 }).catch(() => {});
  await closeTerminal(page);
};
