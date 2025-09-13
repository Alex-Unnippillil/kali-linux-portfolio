module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow importing the same app ID from both \'apps/\' and \'components/apps/\'',
    },
  },
  create(context) {
    const appImports = new Map();
    const componentImports = new Map();
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;
        const componentMatch = source.match(/(?:^|\/)(?:components\/apps)\/([^/]+)/);
        if (componentMatch) {
          const id = componentMatch[1];
          if (appImports.has(id)) {
            context.report({
              node,
              message: `App '${id}' imported from both 'apps/${id}' and 'components/apps/${id}'.`,
            });
          } else {
            componentImports.set(id, node);
          }
          return;
        }
        const appMatch = source.match(/(?:^|\/)(?:apps)\/([^/]+)/);
        if (appMatch) {
          const id = appMatch[1];
          if (componentImports.has(id)) {
            context.report({
              node,
              message: `App '${id}' imported from both 'apps/${id}' and 'components/apps/${id}'.`,
            });
          } else {
            appImports.set(id, node);
          }
        }
      },
    };
  },
};
