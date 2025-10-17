const ensureDesktopContext = async (page) => {
  try {
    const { pathname } = new URL(page.url());
    return pathname === '/' || pathname === '';
  } catch (error) {
    return false;
  }
};

const openTerminalWindow = async (page) => {
  if (!(await ensureDesktopContext(page))) {
    return;
  }

  await page.waitForSelector('#desktop', { timeout: 15000 });
  const terminalSelector = '[data-context="app"][aria-label="Terminal"]';
  const terminalIcon = await page.$(terminalSelector);
  if (!terminalIcon) {
    return;
  }

  await terminalIcon.click();
  await page.waitForSelector('[role="dialog"][aria-label="Terminal"]', { timeout: 15000 });
};

module.exports = openTerminalWindow;
module.exports.ensureDesktopContext = ensureDesktopContext;
