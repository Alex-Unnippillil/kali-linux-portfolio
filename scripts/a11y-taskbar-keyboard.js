module.exports = async (page) => {
  await page.waitForSelector('button[data-app-id]', {
    timeout: 15000,
    state: 'visible',
  });
  await page.focus('button[data-app-id]');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
};
