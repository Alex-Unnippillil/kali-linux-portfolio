import {
  BOARD_WIDTH,
  GEM_IDS,
  createBoard,
  isCandyCrushSessionV1,
  syncCandyIdCounterFromBoard,
} from '../components/apps/candy-crush-logic';

const mockRng = (values: number[]) => {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
};

describe('candy crush session helpers', () => {
  test('isCandyCrushSessionV1 accepts valid shape and rejects malformed values', () => {
    const board = createBoard(BOARD_WIDTH, GEM_IDS, mockRng([0, 0.2, 0.4, 0.6, 0.8]));

    const valid = {
      schemaVersion: 1 as const,
      savedAt: Date.now(),
      board,
      score: 150,
      streak: 3,
      moves: 4,
      movesLeft: 20,
      level: 2,
      targetScore: 1070,
      boosters: { shuffle: 1, colorBomb: 1 },
      paused: false,
      levelComplete: false,
      levelFailed: false,
      showEndScreen: false,
      activeIndex: 10,
      started: true,
      cascadeSource: 'player' as const,
    };

    expect(isCandyCrushSessionV1(valid)).toBe(true);
    expect(
      isCandyCrushSessionV1({
        ...valid,
        schemaVersion: 2,
      }),
    ).toBe(false);
    expect(
      isCandyCrushSessionV1({
        ...valid,
        board: valid.board.slice(0, BOARD_WIDTH),
      }),
    ).toBe(false);
    expect(
      isCandyCrushSessionV1({
        ...valid,
        board: valid.board.map((cell, index) => (index === 0 ? { ...cell, gem: 'invalid' } : cell)),
      }),
    ).toBe(false);
    expect(
      isCandyCrushSessionV1({
        ...valid,
        boosters: { shuffle: -1, colorBomb: 1 },
      }),
    ).toBe(false);
  });

  test('syncCandyIdCounterFromBoard advances id sequence for restored boards', () => {
    const highBoard = Array.from({ length: BOARD_WIDTH * BOARD_WIDTH }, (_, index) => ({
      id: `${GEM_IDS[index % GEM_IDS.length]}-gem-${200 + index}`,
      gem: GEM_IDS[index % GEM_IDS.length],
    }));

    syncCandyIdCounterFromBoard(highBoard);

    const [cell] = createBoard(1, GEM_IDS, mockRng([0]));
    const suffix = Number.parseInt(cell.id.match(/(\d+)$/)?.[1] ?? '0', 10);

    expect(suffix).toBeGreaterThanOrEqual(201);
  });
});
