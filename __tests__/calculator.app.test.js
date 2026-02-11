describe('calculator logic', () => {
  beforeEach(() => {
    jest.resetModules();
    // main.js checks window presence for localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  test('1.1 + 2.2 equals 3.3', () => {
    const calc = require('../apps/calculator/main.js');
    calc.setPreciseMode(true);
    expect(calc.evaluate('1.1+2.2')).toBe('3.3');
  });

  test('base conversions round trip', () => {
    const calc = require('../apps/calculator/main.js');
    const hex = 'FF';
    const bin = calc.convertBase(hex, 16, 2);
    expect(calc.convertBase(bin, 2, 16).toUpperCase()).toBe(hex);
  });
});
