import { toFraction } from '../utils/fraction';
import { solveLinearEquation, solveQuadraticEquation, newtonMethod } from '../utils/solver';

test('toFraction converts decimal to fraction', () => {
  expect(toFraction(0.75)).toBe('3/4');
});

test('solveLinearEquation solves ax+b=0', () => {
  const { solution } = solveLinearEquation('2x+4=0');
  expect(solution).toBe(-2);
});

test('solveQuadraticEquation solves ax^2+bx+c=0', () => {
  const { solutions } = solveQuadraticEquation('x^2-5x+6=0');
  expect(solutions[0]).toBeCloseTo(3);
  expect(solutions[1]).toBeCloseTo(2);
});

test('newtonMethod approximates root', () => {
  const { root } = newtonMethod('x^2-2', 1);
  expect(root).toBeCloseTo(Math.sqrt(2), 3);
});
