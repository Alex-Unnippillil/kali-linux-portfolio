async function openTerminalWindow(page) {
  const terminalIcon = '#app-terminal';
  const windowSelector = '[role="dialog"][aria-label="Terminal"]';

  await page.waitForSelector(terminalIcon, { visible: true, timeout: 15000 });
  await page.click(terminalIcon, { clickCount: 2, delay: 50 });
  await page.waitForSelector(windowSelector, { visible: true, timeout: 15000 });
  return windowSelector;
}

module.exports = async page => {
  const windowSelector = await openTerminalWindow(page);
  const titleBarSelector = `${windowSelector} .bg-ub-window-title`;

  const titleBar = await page.waitForSelector(titleBarSelector, {
    visible: true,
    timeout: 15000,
  });

  const box = await titleBar.boundingBox();
  if (!box) {
    throw new Error('Unable to determine window title bar bounds for snap interaction');
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(50);

  // Drag toward the left edge to trigger the snap preview overlay
  const targetX = Math.max(16, startX - 400);
  const targetY = startY;
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.mouse.move(16, Math.max(80, targetY), { steps: 10 });

  await page.waitForSelector('[data-testid="snap-preview"]', {
    visible: true,
    timeout: 3000,
  });

  // Give the overlay time to settle before releasing the drag
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(250);
};
