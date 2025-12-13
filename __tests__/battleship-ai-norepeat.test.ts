import { MonteCarloAI, RandomAI, RandomSalvoAI, BOARD_SIZE } from '../apps/games/battleship/ai';
import { createRng } from '../apps/games/battleship/rng';

describe('Battleship AIs', () => {
  const runNoRepeat = (ai: { nextMove: (simulations?: number) => number | null; record: (idx: number, hit?: boolean) => void }) => {
    const seen = new Set<number>();
    for (let turn = 0; turn < Math.min(10, BOARD_SIZE * BOARD_SIZE); turn++) {
      const move = ai.nextMove(10);
      if (move == null) break;
      expect(seen.has(move)).toBe(false);
      seen.add(move);
      ai.record(move, false);
    }
    expect(seen.size).toBeLessThanOrEqual(BOARD_SIZE * BOARD_SIZE);
  };

  it('MonteCarloAI never repeats moves', () => {
    const ai = new MonteCarloAI({ rng: createRng(1) });
    runNoRepeat(ai);
  });

  it('RandomAI never repeats moves', () => {
    const ai = new RandomAI({ rng: createRng(2) });
    runNoRepeat({
      nextMove: () => ai.nextMove(),
      record: (idx: number) => ai.record(idx, false),
    });
  });

  it('RandomSalvoAI never repeats moves', () => {
    const ai = new RandomSalvoAI({ rng: createRng(3) });
    runNoRepeat(ai);
  });
});
