const TARGET_HOOKS = new Set(['useMemo', 'useCallback']);

function isTargetHook(node) {
  if (node.callee.type === 'Identifier') {
    return TARGET_HOOKS.has(node.callee.name);
  }

  if (node.callee.type === 'MemberExpression' && !node.callee.computed && node.callee.property.type === 'Identifier') {
    return TARGET_HOOKS.has(node.callee.property.name);
  }

  return false;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'ensure memoization hooks provide dependency arrays so memoized values are not recreated on every render',
      recommended: false,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      provideDependencies: 'Provide a dependency array so the memoized value does not trigger unnecessary renders.',
      addEmptyDependencyArray: 'Add an empty dependency array to memoize the result until inputs change.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isTargetHook(node) || node.arguments.length === 0) {
          return;
        }

        if (node.arguments.length > 1 && node.arguments[1].type === 'ArrayExpression') {
          return;
        }

        context.report({
          node,
          messageId: 'provideDependencies',
          suggest:
            node.arguments.length === 1
              ? [
                  {
                    messageId: 'addEmptyDependencyArray',
                    fix(fixer) {
                      return fixer.insertTextAfter(node.arguments[0], ', []');
                    },
                  },
                ]
              : [],
        });
      },
    };
  },
};
