module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow bulk imports from @phosphor-icons/react to keep icon bundles tree-shakable.',
      recommended: false,
    },
    schema: [],
    messages: {
      usePerIcon:
        'Import icons via "@phosphor-icons/react/dist/ssr/<IconName>" (or /dist/csr for client-only components) instead of bulk "@phosphor-icons/react" entrypoints.',
    },
  },
  create(context) {
    const reportIfInvalid = (node, value) => {
      if (typeof value !== 'string') return;
      const allowedPrefixes = [
        '@phosphor-icons/react/dist/ssr/',
        '@phosphor-icons/react/dist/csr/',
      ];
      const isAllowed = allowedPrefixes.some((prefix) => value.startsWith(prefix));
      if (
        value === '@phosphor-icons/react' ||
        (value.startsWith('@phosphor-icons/react/') && !isAllowed)
      ) {
        context.report({ node, messageId: 'usePerIcon' });
      }
    };

    return {
      ImportDeclaration(node) {
        reportIfInvalid(node.source, node.source && node.source.value);
      },
      CallExpression(node) {
        if (!node.arguments || node.arguments.length === 0) return;
        const [first] = node.arguments;
        if (!first || first.type !== 'Literal') return;
        if (
          (node.callee.type === 'Identifier' && node.callee.name === 'require') ||
          node.callee.type === 'Import'
        ) {
          reportIfInvalid(first, first.value);
        }
      },
    };
  },
};
