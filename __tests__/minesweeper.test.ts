import { createGame, reveal, isMine, isRevealed, computeProbabilities, CellBits, MinesweeperGame } from '../apps/minesweeper/engine';

test('first click has safe 3x3 area and correct mine count', () => {
  const g = createGame(10, 10, 20);
  reveal(g, 5, 5);
  let mines = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      expect(isMine(g, 5 + dx, 5 + dy)).toBe(false);
    }
  }
  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {
      if (isMine(g, x, y)) mines++;
    }
  }
  expect(mines).toBe(20);
});

function manualGame(width: number, height: number, mines: [number, number][]): MinesweeperGame {
  const g: MinesweeperGame = {
    width,
    height,
    mines: mines.length,
    cells: new Uint8Array(width * height),
    revealedCount: 0,
    initialized: true,
  };
  for (const [x, y] of mines) {
    g.cells[x * width + y] |= CellBits.Mine;
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = x * width + y;
      if (g.cells[idx] & CellBits.Mine) continue;
      let count = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (g.cells[nx * width + ny] & CellBits.Mine) count++;
          }
        }
      }
      g.cells[idx] |= count << CellBits.AdjShift;
    }
  }
  return g;
}

test('flood reveal uncovers empty region', () => {
  const g = manualGame(5, 5, [[4, 4]]);
  reveal(g, 0, 0);
  expect(g.revealedCount).toBe(24);
  expect(isRevealed(g, 4, 4)).toBe(false);
});

test('probability solver distributes odds', () => {
  const g = manualGame(2, 2, [[0, 1]]);
  reveal(g, 0, 0);
  const probs = computeProbabilities(g);
  expect(probs[1]).toBeCloseTo(1 / 3);
  expect(probs[2]).toBeCloseTo(1 / 3);
  expect(probs[3]).toBeCloseTo(1 / 3);
});
