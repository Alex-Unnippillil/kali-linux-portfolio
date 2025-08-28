export function parseExpression(expr) {
  try {
    const node = math.parse(expr);
    const compiled = node.compile();
    return (scope = {}) => compiled.evaluate(scope);
  } catch (e) {
    return () => {
      throw e;
    };
  }
}

export function evaluateExpression(expr, scope = {}) {
  try {
    const evalFn = parseExpression(expr);
    const result = evalFn(scope);
    return typeof result === 'number' ? result : result.toString();
  } catch {
    return 'Error';
  }
}
