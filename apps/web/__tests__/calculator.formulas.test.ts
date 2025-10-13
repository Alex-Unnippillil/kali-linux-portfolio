import { validateFormula } from '../apps/calculator/formulas';

global.math = require('mathjs');

describe('formula validation', () => {
  test('accepts valid expressions', () => {
    expect(validateFormula('2+2')).toBe(true);
  });

  test('rejects invalid expressions', () => {
    expect(validateFormula('2++2')).toBe(false);
  });
});

