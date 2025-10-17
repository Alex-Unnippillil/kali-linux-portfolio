module.exports = async page => {
  const desktopArea = '#window-area';
  const desktopMenu = '#desktop-menu';

  await page.waitForSelector(desktopArea, { visible: true, timeout: 15000 });
  await page.click(desktopArea, { button: 'right' });
  await page.waitForSelector(desktopMenu, { visible: true, timeout: 5000 });

  // Allow the menu animations to finish
  await page.waitForTimeout(300);
};
