import {
  applyAction,
  clearLines,
  collides,
  createBoard,
  createInitialGameState,
  DEFAULT_ENGINE_CONFIG,
  getKickTests,
  makeBag,
  mergePiece,
  spawnPiece,
  PieceType,
} from '../components/apps/tetris/engine';

describe('tetris engine core', () => {
  it('detects collisions against walls and board cells', () => {
    const board = createBoard(DEFAULT_ENGINE_CONFIG);
    const piece = spawnPiece('T', DEFAULT_ENGINE_CONFIG);
    expect(collides(board, { ...piece, x: -1 }, DEFAULT_ENGINE_CONFIG)).toBe(true);
    const merged = mergePiece(board, { ...piece, y: piece.y + 4 });
    expect(collides(merged, { ...piece, y: piece.y + 4 }, DEFAULT_ENGINE_CONFIG)).toBe(true);
  });

  it('clears complete lines correctly', () => {
    const board = createBoard(DEFAULT_ENGINE_CONFIG);
    board[board.length - 1] = Array(DEFAULT_ENGINE_CONFIG.width).fill('I');
    const result = clearLines(board, DEFAULT_ENGINE_CONFIG);
    expect(result.linesCleared).toBe(1);
    expect(result.board[0].every((cell) => cell === null)).toBe(true);
  });

  it('7-bag contains all pieces before repeating', () => {
    const { bag } = makeBag(42);
    expect(new Set(bag)).toEqual(new Set(['I', 'O', 'T', 'S', 'Z', 'J', 'L']));
  });

  it('allows hold once before lock and blocks second hold', () => {
    let state = createInitialGameState(DEFAULT_ENGINE_CONFIG, 4);
    state = applyAction(state, { type: 'start' }, DEFAULT_ENGINE_CONFIG);
    state = applyAction(state, { type: 'hold' }, DEFAULT_ENGINE_CONFIG);
    const firstHold = state.hold;
    const blocked = applyAction(state, { type: 'hold' }, DEFAULT_ENGINE_CONFIG);
    expect(firstHold).not.toBeNull();
    expect(blocked.hold).toEqual(firstHold);
    expect(blocked.active?.type).toEqual(state.active?.type);
  });

  it('never locks blocks outside board bounds after repeated hard drops', () => {
    let state = createInitialGameState(DEFAULT_ENGINE_CONFIG, 1);
    state = applyAction(state, { type: 'start' }, DEFAULT_ENGINE_CONFIG);

    for (let i = 0; i < 30; i += 1) {
      if (state.status === 'gameover') break;
      state = applyAction(state, { type: 'hardDrop' }, DEFAULT_ENGINE_CONFIG);
    }

    state.board.forEach((row) => {
      expect(row.length).toBe(DEFAULT_ENGINE_CONFIG.width);
    });
  });
});

describe('SRS kick tables', () => {
  const cases: Array<[string, string, number, number, Array<{ x: number; y: number }>]> = [
    ['T', '0>1 includes left kick', 0, 1, [{ x: -1, y: 0 }]],
    ['T', '0>3 includes right kick', 0, 3, [{ x: 1, y: 0 }]],
    ['J', '1>2 includes up kick', 1, 2, [{ x: 0, y: 2 }]],
    ['L', '3>2 includes down kick', 3, 2, [{ x: -1, y: -1 }]],
    ['S', '2>3 includes right kick', 2, 3, [{ x: 1, y: 0 }]],
    ['Z', '2>1 includes left kick', 2, 1, [{ x: -1, y: 0 }]],
    ['I', '0>1 includes i far left kick', 0, 1, [{ x: -2, y: 0 }]],
    ['I', '1>0 includes i far right kick', 1, 0, [{ x: 2, y: 0 }]],
    ['I', '3>0 includes i up kick', 3, 0, [{ x: 1, y: -2 }]],
    ['I', '0>3 includes i opposite kick', 0, 3, [{ x: 2, y: -1 }]],
  ];

  it.each(cases)('%s %s', (piece, _label, from, to, expected) => {
    const tests = getKickTests(piece as PieceType, from, to);
    expected.forEach((entry) => {
      expect(tests).toContainEqual(entry);
    });
  });
});
