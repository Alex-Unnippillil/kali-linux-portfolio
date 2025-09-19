module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing icon components from outside the shared icon library',
    },
    schema: [],
    messages: {
      useInternalIcons: 'Import icon components from components/ui/icons instead of "{{source}}".',
    },
  },
  create(context) {
    const ICON_MODULE_PATTERN = /(?:^|\/)ui\/icons(?:$|\/index(?:\.[tj]sx?)?$)/;
    const RELATIVE_PATTERN = /^\.{1,2}\//;

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') {
          return;
        }

        if (ICON_MODULE_PATTERN.test(source)) {
          return;
        }

        const hasIconSpecifier = node.specifiers.some((specifier) => {
          if (specifier.type === 'ImportSpecifier' || specifier.type === 'ImportDefaultSpecifier') {
            const importedName =
              specifier.type === 'ImportSpecifier' && specifier.imported
                ? specifier.imported.name
                : specifier.local.name;
            return /Icon$/u.test(importedName);
          }
          if (specifier.type === 'ImportNamespaceSpecifier') {
            return /Icon$/u.test(specifier.local.name);
          }
          return false;
        });

        if (!hasIconSpecifier) {
          return;
        }

        if (RELATIVE_PATTERN.test(source)) {
          return;
        }

        context.report({
          node,
          messageId: 'useInternalIcons',
          data: { source },
        });
      },
    };
  },
};
