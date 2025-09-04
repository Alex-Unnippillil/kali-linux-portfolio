module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow top-level access to window or document',
    },
  },
  create(context) {
    return {
      Identifier(node) {
        if (node.name !== 'window' && node.name !== 'document') return;
        const scope = context.sourceCode.getScope(node);
        if (scope.type === 'global' || scope.type === 'module') {
          context.report({
            node,
            message: `Unexpected global '${node.name}'.`,
          });
        }
      },
    };
  },
};
