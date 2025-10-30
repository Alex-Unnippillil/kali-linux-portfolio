module.exports = async page => {
  await page.evaluateOnNewDocument(() => {
    try {
      window.localStorage.setItem('high-contrast', 'true');
    } catch (error) {
      // Ignore storage errors (e.g. disabled storage in headless mode)
    }
  });

  page.once('domcontentloaded', async () => {
    try {
      await page.evaluate(() => {
        const root = document.documentElement;
        if (!root.classList.contains('high-contrast')) {
          root.classList.add('high-contrast');
        }
      });
    } catch (error) {
      // Ignore evaluation errors, Pa11y will report accessibility issues if loading fails
    }
  });
};

