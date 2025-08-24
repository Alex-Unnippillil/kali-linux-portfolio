import { findMatches, swapPieces, rngFactory } from '@components/apps/match3';
import type { Board, Piece } from '@components/apps/match3';

const make = (color: string): Piece => ({ color, type: 'normal', id: Math.random() });

const simplify = (b: Board) =>
  b.map((row) => row.map((p) => (p ? { c: p.color, t: p.type } : null)));

test('detects horizontal match of three', () => {
  const board: Board = [
    [make('red'), make('red'), make('red')],
    [make('blue'), make('green'), make('yellow')],
    [make('blue'), make('green'), make('yellow')],
  ];
  const matches = findMatches(board);
  expect(matches.size).toBe(3);
});

test('rejects non-adjacent swap', () => {
  const board: Board = [
    [make('a'), make('b'), make('c')],
    [make('d'), make('e'), make('f')],
    [make('g'), make('h'), make('i')],
  ];
  const res = swapPieces(board, { x: 0, y: 0 }, { x: 2, y: 2 });
  expect(res.swapped).toBe(false);
});

test('swap with fixed seed is deterministic', () => {
  const board: Board = [
    [make('a'), make('a'), make('a'), make('b')],
    [make('c'), make('d'), make('e'), make('f')],
    [make('g'), make('h'), make('i'), make('j')],
    [make('k'), make('l'), make('m'), make('n')],
  ];
  const board2: Board = board.map((row) => row.map((p) => (p ? { ...p } : null)));
  const seed = 42;
  const res1 = swapPieces(board, { x: 0, y: 0 }, { x: 1, y: 0 }, rngFactory(seed));
  const res2 = swapPieces(board2, { x: 0, y: 0 }, { x: 1, y: 0 }, rngFactory(seed));
  expect(simplify(res1.board)).toEqual(simplify(res2.board));
});
