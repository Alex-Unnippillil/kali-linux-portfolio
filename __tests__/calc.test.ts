import { evaluate, resetState } from '../apps/calculator/logic';

describe('Calc evaluator', () => {
  beforeEach(() => {
    resetState();
    window.localStorage.clear();
  });

  it('performs precise decimal arithmetic', () => {
    expect(evaluate('0.1 + 0.2')).toBe('0.3');
  });

  it('throws on invalid characters', () => {
    expect(() => evaluate('2 < 3')).toThrow();
  });
});
