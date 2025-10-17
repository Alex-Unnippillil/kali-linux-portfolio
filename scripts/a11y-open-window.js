module.exports = async page => {
  const terminalIcon = '#app-terminal';
  const windowSelector = '[role="dialog"][aria-label="Terminal"]';

  await page.waitForSelector(terminalIcon, { visible: true, timeout: 15000 });
  await page.click(terminalIcon, { clickCount: 2, delay: 50 });
  await page.waitForSelector(windowSelector, { visible: true, timeout: 15000 });

  // Ensure the window is focused and stable before pa11y runs
  await page.waitForTimeout(500);
};
