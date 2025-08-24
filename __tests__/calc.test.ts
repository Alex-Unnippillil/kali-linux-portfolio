import { evaluateExpression } from '@components/apps/calc';

describe('Calc output sanitization', () => {
  test('renders expressions and errors as plain text', () => {
    const resultEl = document.createElement('div');

    resultEl.textContent = evaluateExpression('"<img src=x>"');
    expect(resultEl.textContent).toBe('<img src=x>');
    expect(resultEl.innerHTML).toBe('&lt;img src=x&gt;');

    resultEl.textContent = evaluateExpression('2 < 3');
    expect(resultEl.textContent).toBe('Invalid Expression');
    expect(resultEl.innerHTML).toBe('Invalid Expression');
  });
});

