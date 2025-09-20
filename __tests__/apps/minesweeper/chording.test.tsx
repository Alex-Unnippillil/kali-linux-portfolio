import { getChordTargets, isChordCombo } from '../../../games/minesweeper/chording';
import type { MinesweeperBoard, MinesweeperCell } from '../../../games/minesweeper/chording';

describe('minesweeper chording helpers', () => {
  const makeCell = (overrides: Partial<MinesweeperCell> = {}): MinesweeperCell => ({
    mine: false,
    revealed: false,
    flagged: false,
    question: false,
    adjacent: 0,
    ...overrides,
  });

  describe('isChordCombo', () => {
    it('detects a classic left+right chord', () => {
      expect(
        isChordCombo({ left: true, right: true, space: false, allowSpaceModifier: true }),
      ).toBe(true);
    });

    it('treats the spacebar as a modifier when allowed', () => {
      expect(
        isChordCombo({ left: true, right: false, space: true, allowSpaceModifier: true }),
      ).toBe(true);
    });

    it('ignores the spacebar modifier when disabled', () => {
      expect(
        isChordCombo({ left: true, right: false, space: true, allowSpaceModifier: false }),
      ).toBe(false);
    });

    it('requires the primary button to be active', () => {
      expect(
        isChordCombo({ left: false, right: true, space: true, allowSpaceModifier: true }),
      ).toBe(false);
    });
  });

  describe('getChordTargets', () => {
    const buildBoard = (): MinesweeperBoard => {
      const board: MinesweeperBoard = [
        [makeCell(), makeCell(), makeCell()],
        [makeCell(), makeCell({ revealed: true, adjacent: 2 }), makeCell()],
        [makeCell(), makeCell(), makeCell()],
      ];
      board[0][1].flagged = true;
      board[1][0].flagged = true;
      board[0][0].revealed = true;
      return board;
    };

    it('returns an empty list when the cell cannot chord', () => {
      const board = buildBoard();
      board[1][1].adjacent = 3;
      expect(getChordTargets(board, 1, 1)).toEqual([]);
    });

    it('skips chording when the source cell is hidden', () => {
      const board = buildBoard();
      board[1][1].revealed = false;
      expect(getChordTargets(board, 1, 1)).toEqual([]);
    });

    it('identifies hidden neighbours once flags match', () => {
      const board = buildBoard();
      const targets = getChordTargets(board, 1, 1);
      expect(targets).toEqual([
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ]);
    });

    it('ignores flagged and revealed neighbours', () => {
      const board = buildBoard();
      board[0][2].flagged = true;
      board[1][0].flagged = false;
      board[2][1].revealed = true;
      const targets = getChordTargets(board, 1, 1);
      expect(targets).toEqual([
        { x: 1, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
      ]);
    });
  });
});
