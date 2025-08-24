import { createGame, rotate, createPiece, GameState, PieceType } from '../apps/tetris/engine';

describe('SRS rotation', () => {
  const pieces: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

  test.each(pieces)('%s piece rotates back to origin', (type) => {
    const state: GameState = createGame();
    state.current = createPiece(type);
    const original = JSON.stringify(state.current.shape);
    for (let i = 0; i < 4; i++) rotate(state, 1);
    expect(JSON.stringify(state.current.shape)).toBe(original);
    expect(state.current.rotation).toBe(0);
  });

  test.each(pieces.filter((p) => p !== 'O'))('%s piece wall kicks', (type) => {
    const state: GameState = createGame();
    state.current = createPiece(type);
    state.current.x = 0;
    const success = rotate(state, 1);
    expect(success).toBe(true);
    expect(state.current.x).toBeGreaterThanOrEqual(0);
  });
});
