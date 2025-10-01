const LIST_METHODS = new Set(['map', 'forEach', 'filter', 'reduce', 'flatMap']);

function isListCallback(node) {
  if (!node.parent || node.parent.type !== 'CallExpression') {
    return false;
  }

  const callExpression = node.parent;
  if (callExpression.arguments[0] !== node) {
    return false;
  }

  const callee = callExpression.callee;

  if (callee.type === 'MemberExpression' && !callee.computed && callee.property && LIST_METHODS.has(callee.property.name)) {
    return true;
  }

  return false;
}

function isInlineFunctionExpression(expression) {
  return expression && (expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression');
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'discourage defining inline handlers inside list rendering callbacks to avoid re-creating them on every render',
      recommended: false,
    },
    schema: [],
    messages: {
      moveHandler: 'Avoid creating inline functions inside list rendering. Extract the handler or memoize it outside the loop.',
    },
  },
  create(context) {
    const listCallbackStack = [];

    function enterFunction(node) {
      listCallbackStack.push(isListCallback(node));
    }

    function exitFunction() {
      listCallbackStack.pop();
    }

    return {
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      JSXAttribute(node) {
        if (!listCallbackStack.length || !listCallbackStack[listCallbackStack.length - 1]) {
          return;
        }

        if (!node.value || node.value.type !== 'JSXExpressionContainer') {
          return;
        }

        if (isInlineFunctionExpression(node.value.expression)) {
          context.report({ node: node.value.expression, messageId: 'moveHandler' });
        }
      },
    };
  },
};
