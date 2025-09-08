import fc from "fast-check";
import { generateSudoku } from "../apps/games/sudoku";
import { solve } from "../workers/sudokuSolver";

test("generated sudoku puzzles have valid unique solutions", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
      const { puzzle, solution } = generateSudoku("easy", seed);
      const solved = solve(puzzle.map((r) => r.slice())).solution;
      expect(solved).toEqual(solution);
    }),
    { numRuns: 10 },
  );
});
