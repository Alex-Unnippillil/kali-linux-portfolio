describe('calculator main compatibility', () => {
  test('exposes evaluate and base format', () => {
    const calc = require('../apps/calculator/main.js');
    calc.setProgrammerMode(false);
    expect(calc.evaluate('1+1')).toBe('2');
    calc.setProgrammerMode(true);
    calc.setBase(16);
    expect(calc.evaluate('A')).toBe('A');
  });
});
