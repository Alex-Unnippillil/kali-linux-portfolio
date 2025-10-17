const openTerminal = require('./a11y-open-terminal');

module.exports = async (page) => {
  const ensureDesktopContext = openTerminal.ensureDesktopContext || (async () => false);
  if (!(await ensureDesktopContext(page))) {
    return;
  }

  const dialogSelector = '[role="dialog"][aria-label="Terminal"]';
  const closeButtonSelector = '#close-terminal';
  const dialogHandle = await page.$(dialogSelector);

  if (!dialogHandle) {
    return;
  }

  const closeButton = await page.$(closeButtonSelector);
  if (closeButton) {
    await closeButton.click();
    await page.waitForSelector(dialogSelector, { hidden: true, timeout: 10000 }).catch(() => {});
  }
};
