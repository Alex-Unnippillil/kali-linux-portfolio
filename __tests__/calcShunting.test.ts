import { evaluate } from '../apps/calc/evaluate';

describe('shunting-yard evaluator', () => {
  it('handles basic arithmetic', () => {
    expect(evaluate('2+3*4')).toBe('14');
    expect(evaluate('(2+3)*4')).toBe('20');
  });

  it('supports big integers', () => {
    expect(evaluate('9007199254740991+1', true)).toBe('9007199254740992');
  });
});
