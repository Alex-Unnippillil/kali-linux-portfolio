const quoteFiles = (files) => files.map((file) => JSON.stringify(file)).join(' ');

module.exports = {
  '*.{js,jsx,ts,tsx,json,css,scss,md,mdx,yml,yaml,html}': (files) => {
    if (files.length === 0) return [];
    return [`prettier --write --ignore-unknown ${quoteFiles(files)}`];
  },
  '*.{js,jsx,ts,tsx}': (files) => {
    if (files.length === 0) return [];
    return [`eslint --max-warnings=0 --fix --cache --cache-location node_modules/.cache/eslint ${quoteFiles(files)}`];
  },
  '*.{ts,tsx}': () => 'yarn tsc --noEmit --pretty false',
};
