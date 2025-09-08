import { generateSudoku } from '../apps/games/sudoku';
import { solve } from '../workers/sudokuSolver';

const DIGITS = [1,2,3,4,5,6,7,8,9];

const isValidBoard = (board: number[][]): boolean => {
  const rows = board.every(row => {
    const sorted = [...row].sort((a,b)=>a-b);
    return DIGITS.every((n,i)=>sorted[i]===n);
  });
  const cols = DIGITS.every((_, c) => {
    const col = board.map(row => row[c]).sort((a,b)=>a-b);
    return DIGITS.every((n,i)=>col[i]===n);
  });
  const boxes = [0,3,6].every(r0 =>
    [0,3,6].every(c0 => {
      const cells: number[] = [];
      for(let r=0;r<3;r++) for(let c=0;c<3;c++) cells.push(board[r0+r][c0+c]);
      cells.sort((a,b)=>a-b);
      return DIGITS.every((n,i)=>cells[i]===n);
    })
  );
  return rows && cols && boxes;
};

describe('sudoku win conditions', () => {
  test('generated puzzles are solvable for several seeds', () => {
    for (let seed=0; seed<5; seed++) {
      const { puzzle, solution } = generateSudoku('easy', seed);
      const solved = solve(puzzle.map(r=>r.slice())).solution;
      expect(solved).toEqual(solution);
      expect(isValidBoard(solution)).toBe(true);
    }
  });
});
