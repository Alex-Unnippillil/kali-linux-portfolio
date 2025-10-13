module.exports = async page => {
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('high-contrast', 'true');
    localStorage.setItem('app:theme', 'hc');
  });
};

