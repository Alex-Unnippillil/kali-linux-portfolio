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

    const ext = path.extname(filename);
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
