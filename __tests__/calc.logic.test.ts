const calc = require('../apps/calculator/main.js');

describe('Calculator core logic', () => {
  beforeAll(() => {
    const { create, all } = require('mathjs');
    global.math = create(all);
  });

  test('performs precise decimal arithmetic', () => {
    calc.setPreciseMode(true);
    expect(calc.evaluate('0.1 + 0.2')).toBe('0.3');
    calc.setPreciseMode(false);
  });

  test('throws on invalid expressions', () => {
    expect(() => calc.evaluate('2 < 3')).toThrow();
  });
});
