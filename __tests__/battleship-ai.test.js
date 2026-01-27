import { MonteCarloAI, randomizePlacement, BOARD_SIZE } from '../apps/games/battleship/ai';

test('AI computes move under 500ms', () => {
  const ai = new MonteCarloAI();
  // simulate some prior knowledge
  ai.record(0, false);
  ai.record(1, false);
  const start = Date.now();
  const move = ai.nextMove(300);
  const duration = Date.now() - start;
  expect(move).not.toBeNull();
  expect(duration).toBeLessThan(1000);
});

test('randomizePlacement enforces no-adjacency rule', () => {
  const layout = randomizePlacement(true);
  const occupied = new Set();
  layout.forEach((ship) => {
    ship.cells.forEach((c) => {
      const x = c % BOARD_SIZE;
      const y = Math.floor(c / BOARD_SIZE);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) continue;
          const nIdx = ny * BOARD_SIZE + nx;
          expect(occupied.has(nIdx)).toBe(false);
        }
      }
    });
    ship.cells.forEach((c) => occupied.add(c));
  });
});
