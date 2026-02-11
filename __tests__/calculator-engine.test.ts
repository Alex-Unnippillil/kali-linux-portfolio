import { safeEvaluate } from '../apps/calculator/engine';

describe('calculator engine', () => {
  test('precedence and associativity', () => {
    expect(safeEvaluate('2+3*4', { mode: 'basic' })).toMatchObject({ ok: true, value: '14' });
    expect(safeEvaluate('(2+3)*4', { mode: 'basic' })).toMatchObject({ ok: true, value: '20' });
    expect(safeEvaluate('2^3^2', { mode: 'scientific' })).toMatchObject({ ok: true, value: '512' });
  });

  test('unary operators', () => {
    expect(safeEvaluate('-3^2', { mode: 'scientific' })).toMatchObject({ ok: true, value: '-9' });
    expect(safeEvaluate('~1', { mode: 'programmer', base: 10 })).toMatchObject({ ok: true, value: '18446744073709551614' });
    expect(safeEvaluate('-(2+3)', { mode: 'scientific' })).toMatchObject({ ok: true, value: '-5' });
  });

  test('functions and factorial', () => {
    expect(safeEvaluate('sqrt(9)', { mode: 'scientific' })).toMatchObject({ ok: true, value: '3' });
    expect(safeEvaluate('mod(10,3)', { mode: 'scientific' })).toMatchObject({ ok: true, value: '1' });
    expect(safeEvaluate('5!', { mode: 'scientific' })).toMatchObject({ ok: true, value: '120' });
    const fail = safeEvaluate('(-1)!', { mode: 'scientific' });
    expect(fail.ok).toBe(false);
  });

  test('programmer parsing and ops', () => {
    expect(safeEvaluate('FF', { mode: 'programmer', base: 16 })).toMatchObject({ ok: true, value: 'FF' });
    expect(safeEvaluate('1010', { mode: 'programmer', base: 2 })).toMatchObject({ ok: true, value: '1010' });
    expect(safeEvaluate('A & 3', { mode: 'programmer', base: 16 })).toMatchObject({ ok: true, value: '2' });
    expect(safeEvaluate('1 << 4', { mode: 'programmer', base: 10 })).toMatchObject({ ok: true, value: '16' });
  });

  test('error index reporting', () => {
    const cases = ['2+', 'sqrt(-1)', '2*(3', '1<<300', '2$2'];
    for (const expr of cases) {
      const res = safeEvaluate(expr, { mode: expr.includes('<<') ? 'programmer' : 'scientific', base: 10 });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(typeof res.error.index).toBe('number');
    }
  });
});
