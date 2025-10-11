import {
  CANDY_COLORS,
  createBoard,
  detonateColorBomb,
  findMatches,
  resolveBoard,
  scoreCascade,
  shuffleBoard,
} from '../components/apps/candy-crush-logic';

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
    const board = [
      'R', 'R', 'R', 'G',
      'B', 'B', 'C', 'G',
      'D', 'B', 'E', 'G',
      'F', 'B', 'H', 'I',
    ];

    const matches = findMatches(board, 4);
    const groups = matches.map((group) => group.join(','));

    expect(groups).toEqual(
      expect.arrayContaining(['0,1,2', '5,9,13', '3,7,11']),
    );
  });

  test('resolveBoard clears matches and fills gaps with deterministic colors', () => {
    const board = [
      'A', 'A', 'A', 'B',
      'C', 'D', 'E', 'F',
      'G', 'H', 'I', 'J',
      'K', 'L', 'M', 'N',
    ];
    const rng = mockRng([0, 0.5, 0.9]);

    const result = resolveBoard(board, 4, CANDY_COLORS, rng);

    expect(result.cascades).toHaveLength(1);
    expect(result.cleared).toBe(3);
    expect(result.board.slice(0, 3)).toEqual([
      CANDY_COLORS[0],
      CANDY_COLORS[2],
      CANDY_COLORS[4],
    ]);
    expect(result.board[3]).toBe('B');
  });

  test('shuffleBoard retains the multiset of candies but changes positions', () => {
    const board = createBoard(4, ['A', 'B', 'C', 'D'], mockRng([0, 0.25, 0.5, 0.75]));
    const shuffled = shuffleBoard(board, mockRng([0.9, 0.1, 0.6, 0.3]));

    expect([...shuffled].sort()).toEqual([...board].sort());
    expect(shuffled).not.toEqual(board);
  });

  test('detonateColorBomb removes the most common color and returns count', () => {
    const board = [
      '#1', '#1', '#2', '#3',
      '#1', '#4', '#2', '#5',
      '#1', '#6', '#7', '#8',
      '#9', '#10', '#11', '#12',
    ];
    const rng = mockRng([0.1, 0.4, 0.5, 0.7, 0.6]);

    const result = detonateColorBomb(board, 4, ['#1', '#2', '#3'], rng);

    expect(result.removed).toBe(4);
    expect(result.board.filter((color) => color === '#1')).toHaveLength(0);
  });

  test('scoreCascade applies chain multiplier and bonuses for long matches', () => {
    const cascade = { matches: [[0, 1, 2, 3], [8, 12, 16]] };
    const first = scoreCascade(cascade, 1);
    const second = scoreCascade(cascade, 2);

    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first * 2);
  });
});

