import { randomizePlacement } from '../components/apps/battleship/ai';
import { ProbabilisticAI } from '../components/apps/battleship';

test('AI computes move under 500ms', () => {
  const ai = new ProbabilisticAI(10);
  // simulate some prior knowledge
  ai.record(0, false);
  ai.record(1, false);
  const start = Date.now();
  const move = ai.nextMove(100);
  const duration = Date.now() - start;
  expect(move).not.toBeNull();
  expect(duration).toBeLessThan(500);
});

test('randomizePlacement enforces no-adjacency rule', () => {
  const size = 10;
  const layout = randomizePlacement(size, true);
  const occupied = new Set();
  layout.forEach((ship) => {
    ship.cells.forEach((c) => {
      const x = c % size;
      const y = Math.floor(c / size);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const nIdx = ny * size + nx;
          expect(occupied.has(nIdx)).toBe(false);
        }
      }
    });
    ship.cells.forEach((c) => occupied.add(c));
  });
});
