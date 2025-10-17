const openTerminal = require('./a11y-open-terminal');

module.exports = async (page) => {
  const ensureDesktopContext = openTerminal.ensureDesktopContext || (async () => false);
  if (!(await ensureDesktopContext(page))) {
    return;
  }

  const menuSelector = '#desktop-menu';
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForSelector(menuSelector, { hidden: true, timeout: 1000 }).catch(async () => {
    const desktopArea = await page.$('#window-area[data-context="desktop-area"]');
    if (desktopArea) {
      const box = await desktopArea.boundingBox();
      if (box) {
        await page.mouse.click(box.x + 16, box.y + 16, { button: 'left' });
      }
    }
    await page.waitForSelector(menuSelector, { hidden: true, timeout: 1000 }).catch(() => {});
  });
};
