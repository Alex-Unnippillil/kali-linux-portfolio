async function ensureTerminalRunning(page) {
  const terminalIcon = '#app-terminal';
  const taskbarButton = 'button[data-context="taskbar"][data-app-id="terminal"]';

  await page.waitForSelector(terminalIcon, { visible: true, timeout: 15000 });
  await page.click(terminalIcon, { clickCount: 2, delay: 50 });
  await page.waitForSelector(taskbarButton, { visible: true, timeout: 15000 });
  return taskbarButton;
}

module.exports = async page => {
  const taskbarButton = await ensureTerminalRunning(page);
  const taskbarMenu = '#taskbar-menu';

  await page.click(taskbarButton, { button: 'right' });
  await page.waitForSelector(taskbarMenu, { visible: true, timeout: 5000 });
  await page.waitForTimeout(300);
};
