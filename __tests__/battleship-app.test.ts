import { BattleshipAI } from '../apps/battleship/ai';
import generatePuzzle, { countSolutions } from '../apps/battleship/puzzle';

test('Hunt & Target AI produces move quickly', () => {
  const ai = new BattleshipAI(10);
  const board = Array.from({ length: 10 }, () => Array(10).fill(0));
  const start = Date.now();
  const shot = ai.nextShot(board, 2);
  const duration = Date.now() - start;
  expect(shot).toBeDefined();
  expect(duration).toBeLessThan(50);
});

test('Puzzle generator yields unique solution under 200ms', () => {
  const start = Date.now();
  const puzzle = generatePuzzle(6);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(200);
  const solutions = countSolutions(
    puzzle.puzzle.map((r) => r.slice()),
    puzzle.rowCounts.slice(),
    puzzle.colCounts.slice(),
  );
  expect(solutions).toBe(1);
});
