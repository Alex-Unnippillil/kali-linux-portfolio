import { slideRow, transpose, hasMoves } from '../apps/2048/engine';

describe('2048 engine', () => {
  test('slideRow merges and shifts numbers', () => {
    expect(slideRow([2, 0, 2, 0])).toEqual([4, 0, 0, 0]);
    expect(slideRow([2, 2, 2, 0])).toEqual([4, 2, 0, 0]);
    expect(slideRow([2, 2, 2, 2])).toEqual([4, 4, 0, 0]);
  });

  test('transpose swaps rows and columns', () => {
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

  test('hasMoves detects available moves', () => {
    expect(
      hasMoves([
        [2, 4, 8, 16],
        [32, 64, 0, 256],
        [512, 1024, 2, 4],
        [8, 16, 32, 64],
      ])
    ).toBe(true);

    expect(
      hasMoves([
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2, 4],
        [8, 16, 32, 64],
      ])
    ).toBe(false);
  });
});
