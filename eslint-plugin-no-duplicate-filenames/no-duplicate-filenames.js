const path = require('path');

const files = new Map();

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow files with identical base names across different extensions',
    },
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename || filename === '<text>') return {};
    // Ignore test files and spec files to avoid false positives in __tests__
    if (
      filename.includes('/__tests__/') ||
      filename.includes('.test.') ||
      filename.includes('.spec.')
    ) {
      return {};
    }

    const ext = path.extname(filename);
    // Only enforce for common script extensions
    const allowedExts = new Set(['.js', '.jsx', '.ts', '.tsx']);
    if (!allowedExts.has(ext) || filename.endsWith('.d.ts')) {
      return {};
    }
    const base = path.basename(filename, ext);
    const dir = path.dirname(filename);
    const key = path.join(dir, base);
    const prevExt = files.get(key);

    return {
      Program(node) {
        if (prevExt && prevExt !== ext) {
          context.report({
            node,
            message: `File with base name '${base}' has multiple extensions ('${prevExt}' and '${ext}').`,
          });
        } else {
          files.set(key, ext);
        }
      },
    };
  },
};
