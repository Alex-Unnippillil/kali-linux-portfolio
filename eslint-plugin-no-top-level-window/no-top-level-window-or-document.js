module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow referencing window or document at the module top level',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const globalScope = context.sourceCode.scopeManager.globalScope;
        if (!globalScope) return;
        globalScope.through.forEach((ref) => {
          const name = ref.identifier.name;
          if ((name === 'window' || name === 'document') && ref.from.type === 'module') {
            context.report({
              node: ref.identifier,
              message: `Unexpected top-level usage of ${name}.`,
            });
          }
        });
      },
    };
  },
};
