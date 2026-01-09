import {
  BOARD_WIDTH,
  GEM_IDS,
  createBoard,
  findMatches,
  resolveBoard,
  scoreCascade,
  shuffleBoard,
  makeRng,
  hasAnyValidSwap,
  trySwap,
  beginResolve,
  stepResolve,
} from '../components/apps/candy-crush-logic';

const makeBoard = (values: string[]) => values.map((gem, index) => ({ id: `cell-${index}`, gem }));

const mockRng = (values: number[]) => {
  const rng = makeRng(1);
  let index = 0;
  Object.defineProperty(rng, 'nextFloat', {
    value: () => {
      const value = values[index % values.length];
      index += 1;
      return value;
    },
  });
  return rng;
};

describe('candy crush logic helpers', () => {
  test('createBoard avoids starting matches and ensures swap', () => {
    const rng = makeRng(1234);
    const board = createBoard(BOARD_WIDTH, GEM_IDS, rng, { ensurePlayable: true });
    expect(findMatches(board)).toHaveLength(0);
    expect(hasAnyValidSwap(board)).toBe(true);
  });

  test('findMatches detects horizontal and vertical groups', () => {
    const [A, B, C, D, E] = GEM_IDS;
    const board = makeBoard([
      A,
      A,
      A,
      B,
      C,
      B,
      D,
      B,
      E,
      B,
      A,
      B,
      C,
      B,
      D,
      E,
    ]);

    const matches = findMatches(board, 4);
    const groups = matches.map((group) => group.cells.join(','));

    expect(groups).toEqual(expect.arrayContaining(['0,1,2', '5,9,13', '3,7,11']));
  });

  test('trySwap rejects non-matching swap in strict mode', () => {
    const board = makeBoard([
      'aurora',
      'solstice',
      'abyss',
      'aurora',
    ]);
    const result = trySwap(board, 0, 1, 'strict');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-match');
  });

  test('resolver steps through phases and terminates', () => {
    const board = makeBoard([
      'aurora',
      'aurora',
      'aurora',
      'ion',
      'pulse',
      'solstice',
      'abyss',
      'ion',
      'pulse',
      'solstice',
      'abyss',
      'ion',
      'pulse',
      'solstice',
      'abyss',
      'ion',
    ]);
    let state = beginResolve(board, 4);
    const seenPhases = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      seenPhases.add(state.phase);
      state = stepResolve(state, 4, GEM_IDS, makeRng(1));
      if (state.phase === 'idle') break;
    }
    expect(seenPhases.has('clear')).toBe(true);
    expect(seenPhases.has('fall')).toBe(true);
    expect(seenPhases.has('refill')).toBe(true);
    expect(state.phase).toBe('idle');
  });

  test('shuffleBoard retains the multiset of candies but changes positions', () => {
    const board = createBoard(4, GEM_IDS, mockRng([0, 0.25, 0.5, 0.75]));
    const shuffled = shuffleBoard(board, mockRng([0.9, 0.1, 0.6, 0.3]));

    expect(shuffled.map((cell) => cell.gem).sort()).toEqual(board.map((cell) => cell.gem).sort());
    expect(shuffled).not.toEqual(board);
  });

  test('scoreCascade applies chain multiplier and bonuses for long matches', () => {
    const cascade = { matches: [[0, 1, 2, 3], [8, 12, 16]] };
    const first = scoreCascade(cascade, 1);
    const second = scoreCascade(cascade, 2);

    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first * 2);
  });
});
