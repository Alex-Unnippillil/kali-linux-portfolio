import { slideRow, hasMoves, transpose } from '../engine';

describe('slideRow', () => {
  it('merges tiles and slides left', () => {
    expect(slideRow([2, 0, 2, 0])).toEqual([4, 0, 0, 0]);
  });

  it('prevents double merges', () => {
    expect(slideRow([2, 2, 2, 2])).toEqual([4, 4, 0, 0]);
  });
});

describe('hasMoves', () => {
  it('detects empty cells', () => {
    const board = [
      [2, 4, 8, 16],
      [32, 64, 0, 128],
      [256, 512, 1024, 2048],
      [4, 2, 4, 2],
    ];
    expect(hasMoves(board)).toBe(true);
  });

  it('detects possible merges', () => {
    const board = [
      [2, 2, 4, 8],
      [16, 32, 64, 128],
      [256, 512, 1024, 2048],
      [4, 8, 16, 32],
    ];
    expect(hasMoves(board)).toBe(true);
  });

  it('detects no moves left', () => {
    const board = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 4],
      [8, 16, 32, 64],
    ];
    expect(hasMoves(board)).toBe(false);
  });
});

describe('transpose', () => {
  it('transposes a board', () => {
    const board = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    expect(transpose(board)).toEqual([
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);
  });

  it('is its own inverse', () => {
    const board = [
      [1, 2],
      [3, 4],
    ];
    expect(transpose(transpose(board))).toEqual(board);
  });

  it('handles empty board', () => {
    expect(transpose([])).toEqual([]);
  });
});
