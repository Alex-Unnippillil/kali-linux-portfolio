import {
  GEM_IDS,
  createBoard,
  detonateColorBomb,
  findMatches,
  removeCandyAt,
  resolveBoard,
  scoreCascade,
  shuffleBoard,
} from '../components/apps/candy-crush-logic';

const makeBoard = (values: string[]) =>
  values.map((gem, index) => ({ id: `cell-${index}`, gem }));

const mockRng = (values: number[]) => {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
};

describe('candy crush logic helpers', () => {
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
    const groups = matches.map((group) => group.join(','));

    expect(groups).toEqual(
      expect.arrayContaining(['0,1,2', '5,9,13', '3,7,11']),
    );
  });

  test('resolveBoard clears matches and fills gaps with deterministic colors', () => {
    const board = makeBoard([
      GEM_IDS[0],
      GEM_IDS[0],
      GEM_IDS[0],
      GEM_IDS[1],
      'u1',
      'u2',
      'u3',
      'u4',
      'u5',
      'u6',
      'u7',
      'u8',
      'u9',
      'u10',
      'u11',
      'u12',
    ]);
    const rng = mockRng([0, 0.5, 0.9]);

    const result = resolveBoard(board, 4, GEM_IDS, rng);

    expect(result.cascades).toHaveLength(1);
    expect(result.cleared).toBe(3);
    expect(result.board.slice(0, 3).map((cell) => cell.gem)).toEqual([
      GEM_IDS[0],
      GEM_IDS[2],
      GEM_IDS[4],
    ]);
    expect(result.board[3].gem).toBe(GEM_IDS[1]);
  });

  test('shuffleBoard retains the multiset of candies but changes positions', () => {
    const board = createBoard(4, GEM_IDS, mockRng([0, 0.25, 0.5, 0.75]));
    const shuffled = shuffleBoard(board, mockRng([0.9, 0.1, 0.6, 0.3]));

    expect(shuffled.map((cell) => cell.gem).sort()).toEqual(board.map((cell) => cell.gem).sort());
    expect(shuffled).not.toEqual(board);
  });

  test('detonateColorBomb removes the most common color and returns count', () => {
    const [a, b, c, d, e] = GEM_IDS;
    const board = makeBoard([
      a,
      a,
      b,
      c,
      a,
      d,
      b,
      e,
      b,
      c,
      d,
      e,
      c,
      d,
      e,
      a,
    ]);
    const rng = mockRng([0.1, 0.4, 0.5, 0.7, 0.6]);

    const result = detonateColorBomb(board, 4, GEM_IDS, rng);

    expect(result.removed).toBe(4);
    expect(result.board.filter((cell) => cell.gem === a)).toHaveLength(0);
  });

  test('scoreCascade applies chain multiplier and bonuses for long matches', () => {
    const cascade = { matches: [[0, 1, 2, 3], [8, 12, 16]] };
    const first = scoreCascade(cascade, 1);
    const second = scoreCascade(cascade, 2);

    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first * 2);
  });

  test('removeCandyAt removes a candy and returns a refreshed board', () => {
    const [a, b, c, d, e] = GEM_IDS;
    const board = makeBoard([
      a,
      b,
      c,
      d,
      b,
      c,
      d,
      e,
      c,
      d,
      e,
      a,
      d,
      e,
      a,
      b,
    ]);
    const rng = mockRng([0.1, 0.2, 0.3]);

    const result = removeCandyAt(board, 0, 4, GEM_IDS, rng);

    expect(result.removed).toBe(1);
    expect(result.color).toBe(a);
    expect(result.board).toHaveLength(board.length);
    expect(result.board.some((cell) => cell.gem === 'unknown')).toBe(false);
  });
});
