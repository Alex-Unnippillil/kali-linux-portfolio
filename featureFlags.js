module.exports = {
  lighthouse: process.env.FEATURE_LIGHTHOUSE !== 'off',
  playwright: process.env.FEATURE_PLAYWRIGHT !== 'off',
};
