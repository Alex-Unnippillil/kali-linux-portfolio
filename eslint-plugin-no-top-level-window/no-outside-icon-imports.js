const createRegExp = (value) => (value instanceof RegExp ? value : new RegExp(value));

const defaultDisallow = [
  {
    pattern: 'themes/Yaru/window',
    message: 'Use components/ui/icons for window controls.',
  },
];

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow referencing deprecated icon asset paths',
    },
    schema: [
      {
        type: 'object',
        properties: {
          disallow: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                pattern: { type: 'string' },
                message: { type: 'string' },
              },
              required: ['pattern'],
              additionalProperties: false,
            },
          },
          include: {
            type: 'array',
            items: { type: 'string' },
          },
          ignore: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const filename = context.getFilename();

    const includePatterns = (options.include || ['.*']).map(createRegExp);
    const ignorePatterns = (options.ignore || []).map(createRegExp);

    const isIncluded = includePatterns.some((regex) => regex.test(filename));
    if (!isIncluded) {
      return {};
    }

    const isIgnored = ignorePatterns.some((regex) => regex.test(filename));
    if (isIgnored) {
      return {};
    }

    const disallow = (options.disallow || defaultDisallow).map(({ pattern, message }) => ({
      regex: createRegExp(pattern),
      message: message || `Use shared icon components instead of '${pattern}'.`,
    }));

    const checkValue = (node, value) => {
      if (typeof value !== 'string') return;
      for (const { regex, message } of disallow) {
        if (regex.test(value)) {
          context.report({
            node,
            message,
          });
          break;
        }
      }
    };

    return {
      Literal(node) {
        checkValue(node, node.value);
      },
      TemplateLiteral(node) {
        if (node.expressions.length > 0) return;
        const text = node.quasis[0]?.value?.cooked;
        checkValue(node, text);
      },
      ImportDeclaration(node) {
        checkValue(node.source, node.source.value);
      },
    };
  },
};
