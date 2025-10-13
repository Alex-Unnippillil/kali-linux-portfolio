import { analyzeEliminations } from "../games/sudoku/components/EliminationHelper";

describe("analyzeEliminations", () => {
  test("identifies candidates that can be removed", () => {
    const board: number[][] = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ];
    const hints = analyzeEliminations(board);
    // Cell (1,3) (0-index 0,2) cannot be 5 since row already has 5
    expect(
      hints.some((h) => h.r === 0 && h.c === 2 && h.value === 5)
    ).toBe(true);
  });
});

