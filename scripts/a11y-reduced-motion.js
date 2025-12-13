module.exports = async page => {
  if (typeof page.emulateMediaFeatures === 'function') {
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);
  }
};
