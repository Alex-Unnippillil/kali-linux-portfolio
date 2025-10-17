const openTerminal = require('./a11y-open-terminal');

module.exports = async (page) => {
  const ensureDesktopContext = openTerminal.ensureDesktopContext || (async () => false);
  if (!(await ensureDesktopContext(page))) {
    return;
  }

  await page.waitForSelector('#window-area[data-context="desktop-area"]', { timeout: 15000 });
  const desktopArea = await page.$('#window-area[data-context="desktop-area"]');
  if (!desktopArea) {
    return;
  }

  const box = await desktopArea.boundingBox();
  if (!box) {
    return;
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.click(x, y, { button: 'right' });
  await page.waitForSelector('#desktop-menu', { visible: true, timeout: 2000 }).catch(() => {});
};
