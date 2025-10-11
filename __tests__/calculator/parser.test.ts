import {
  tokenize,
  toRPN,
  evaluate,
  memoryAdd,
  memorySubtract,
  memoryRecall,
  resetMemory,
  resetState,
  setMode,
  setBase,
  setProgrammerMode,
} from '../../apps/calculator/logic';

describe('calculator parser', () => {
  beforeEach(() => {
    resetState();
    resetMemory();
    window.localStorage.clear();
  });

  it('tokenizes unary operators for shunting yard', () => {
    const tokens = tokenize('-3 + 4');
    const rpn = toRPN(tokens);
    const serialized = rpn.map((token) => {
      if (token.type === 'number') return token.raw;
      if (token.type === 'operator') return token.symbol;
      return token.type === 'identifier' ? `id:${token.name}` : token.type;
    });
    expect(serialized).toEqual(['3', 'negate', '4', 'add']);
  });

  it('resolves operator precedence', () => {
    expect(evaluate('2+3*4')).toBe('14');
    expect(evaluate('2*(3+4)')).toBe('14');
  });

  it('evaluates scientific functions', () => {
    expect(evaluate('sin(pi/2)')).toBe('1');
    expect(evaluate('sqrt(16)')).toBe('4');
    expect(evaluate('50%')).toBe('0.5');
  });

  it('supports stored variables', () => {
    window.localStorage.setItem('calc-vars', JSON.stringify({ x: '5', y: '7' }));
    expect(evaluate('x + y')).toBe('12');
  });

  it('handles programmer mode with base conversions', () => {
    setMode('programmer');
    setProgrammerMode(true);
    setBase(16);
    expect(evaluate('FF + 1')).toBe('100');
    expect(evaluate('1010 & 1100')).toBe('1000');
  });

  it('tracks memory registers', () => {
    expect(memoryRecall()).toBe('0');
    memoryAdd('5');
    expect(memoryRecall()).toBe('5');
    memorySubtract('2');
    expect(memoryRecall()).toBe('3');
  });
});
