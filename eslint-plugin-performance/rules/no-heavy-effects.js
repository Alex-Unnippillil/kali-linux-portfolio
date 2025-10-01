const HEAVY_LOOP_TYPES = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
]);

const HEAVY_MEMBER_METHODS = new Set(['map', 'forEach', 'reduce', 'filter', 'flatMap', 'sort']);

const HEAVY_CALL_IDENTIFIERS = new Set(['fetch', 'requestAnimationFrame', 'setTimeout', 'setInterval', 'Promise', 'queueMicrotask']);

function isUseEffectCall(node) {
  if (node.callee.type === 'Identifier') {
    return node.callee.name === 'useEffect';
  }

  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property &&
    node.callee.property.type === 'Identifier'
  ) {
    return node.callee.property.name === 'useEffect';
  }

  return false;
}

function isHeavyCallExpression(node) {
  if (node.callee.type === 'Identifier') {
    return HEAVY_CALL_IDENTIFIERS.has(node.callee.name);
  }

  if (node.callee.type === 'MemberExpression' && !node.callee.computed && node.callee.property.type === 'Identifier') {
    if (HEAVY_MEMBER_METHODS.has(node.callee.property.name)) {
      return true;
    }
  }

  return false;
}

function containsHeavyWork(node, context) {
  if (!node) {
    return false;
  }

  if (HEAVY_LOOP_TYPES.has(node.type)) {
    return true;
  }

  if (node.type === 'CallExpression' && isHeavyCallExpression(node)) {
    return true;
  }

  const sourceCode = context.getSourceCode();
  const visitorKeys = sourceCode.visitorKeys[node.type] || [];

  for (const key of visitorKeys) {
    const value = node[key];
    if (Array.isArray(value)) {
      if (value.some((child) => child && containsHeavyWork(child, context))) {
        return true;
      }
    } else if (value && containsHeavyWork(value, context)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'warn when heavy computations are performed in useEffect without a dependency array, which can cause repeated expensive work',
      recommended: false,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      heavyEffect:
        'Avoid heavy operations inside useEffect without dependencies. Move the computation or limit the effect with a dependency array.',
      addDependencies: 'Add an empty dependency array so the effect only runs on mount.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isUseEffectCall(node) || node.arguments.length === 0) {
          return;
        }

        const callback = node.arguments[0];
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
          return;
        }

        const body = callback.body;
        let hasHeavyWork = false;

        if (body.type === 'BlockStatement') {
          hasHeavyWork = containsHeavyWork(body, context);
        } else {
          hasHeavyWork = containsHeavyWork(body, context);
        }

        if (!hasHeavyWork || node.arguments.length > 1) {
          return;
        }

        context.report({
          node: callback,
          messageId: 'heavyEffect',
          suggest: [
            {
              messageId: 'addDependencies',
              fix(fixer) {
                return fixer.insertTextAfter(callback, ', []');
              },
            },
          ],
        });
      },
    };
  },
};
