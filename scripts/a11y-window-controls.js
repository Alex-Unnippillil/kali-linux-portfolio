module.exports = async (page) => {
  await page.waitForSelector('button[data-app-id]', {
    timeout: 15000,
    state: 'visible',
  });
  await page.focus('button[data-app-id]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-window-controls] button', {
    timeout: 10000,
    state: 'visible',
  });
  await page.focus('[data-window-controls] button');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('End');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
};
