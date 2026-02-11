import { safeEvaluate } from '../apps/calculator/engine';

test('supports constants and functions', () => {
  expect(safeEvaluate('sin(pi/2)', { mode: 'scientific' })).toMatchObject({ ok: true, value: '1' });
});
