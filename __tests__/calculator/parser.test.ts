const calc = require('../../apps/calculator/main.js');

describe('calculator parser compatibility', () => {
  test('log and variables are supported', () => {
    calc.setProgrammerMode(false);
    expect(Number(calc.evaluate('log(10)'))).toBeCloseTo(1, 8);
    window.localStorage.setItem('calc-vars', JSON.stringify({ x: '5', y: '2' }));
    expect(calc.evaluate('x+y')).toBe('7');
  });
});
