import { detectMatches, validateSwap } from '../components/apps/candy-crush/engine/match';
import { specialFromMatch, resolveCombo } from '../components/apps/candy-crush/engine/specials';
import { resolveTurn } from '../components/apps/candy-crush/engine/resolve';
import { updateObjectives } from '../components/apps/candy-crush/engine/objectives';
import type { Board } from '../components/apps/candy-crush/engine/types';
import { boardIsStable, validateBoardInvariants } from '../components/apps/candy-crush/engine/invariants';

const colorMap = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;

const boardFrom = (grid: number[][]): Board => ({
  rows: grid.length,
  cols: grid[0].length,
  cells: grid.map((row, r) => row.map((v, c) => ({ coord: { r, c }, candy: v < 0 ? null : { id: `${r}-${c}`, color: colorMap[v], kind: 'normal' as const }, jelly: 0 as const, ice: 0 as const, hole: false }))),
});

describe('candy crush engine', () => {
  test('detects matches', () => {
    const board = boardFrom([
      [0, 0, 0, 1],
      [1, 2, 3, 4],
      [2, 2, 2, 4],
      [1, 3, 4, 5],
    ]);
    expect(detectMatches(board).length).toBe(2);
  });

  test('validates legal swap', () => {
    const board = boardFrom([
      [1, 2, 1],
      [2, 1, 2],
      [3, 2, 3],
    ]);
    expect(validateSwap(board, { r: 0, c: 1 }, { r: 1, c: 1 })).toBe(true);
  });

  test('special creation rule detects line4 striped', () => {
    const group = detectMatches(boardFrom([[0, 0, 0, 0]]) )[0];
    expect(specialFromMatch(group)).toBe('stripedH');
  });

  test('special combo color bomb + bomb clears board', () => {
    const board = boardFrom([
      [0, 1, 2],
      [3, 4, 5],
      [0, 1, 2],
    ]);
    board.cells[0][0].candy = { id: 'a', color: null, kind: 'colorBomb' };
    board.cells[0][1].candy = { id: 'b', color: null, kind: 'colorBomb' };
    const combo = resolveCombo(board, { r: 0, c: 0 }, { r: 0, c: 1 });
    expect(combo?.cells.length).toBe(9);
  });

  test('resolve cascade terminates and ends stable', () => {
    const board = boardFrom([
      [0, 0, 1, 2, 3],
      [1, 0, 2, 3, 4],
      [2, 1, 0, 4, 5],
      [3, 2, 3, 0, 1],
      [4, 3, 4, 1, 0],
    ]);
    const result = resolveTurn(board, { r: 0, c: 2 }, { r: 1, c: 2 }, [...colorMap], {}, 42);
    expect(result.queue[result.queue.length - 1].type).toBe('stable');
    expect(boardIsStable(result.board)).toBe(true);
    expect(validateBoardInvariants(result.board)).toEqual([]);
  });

  test('updates objectives', () => {
    const updated = updateObjectives(
      [
        { type: 'score', target: 500, progress: 0 },
        { type: 'collectColor', color: 'red', target: 3, progress: 0 },
      ],
      { removed: [], removedColors: ['red', 'blue', 'red'], scoreDelta: 240, jellyCleared: 0, iceCleared: 0 },
    );
    expect(updated[0].progress).toBe(240);
    expect(updated[1].progress).toBe(2);
  });

  test('randomized resolve invariants hold', () => {
    for (let i = 0; i < 15; i += 1) {
      const grid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => Math.floor(Math.random() * 6)));
      const board = boardFrom(grid);
      const result = resolveTurn(board, { r: 0, c: 0 }, { r: 0, c: 1 }, [...colorMap], {}, i + 1);
      expect(validateBoardInvariants(result.board)).toEqual([]);
      expect(result.queue.length).toBeLessThan(500);
    }
  });
});
