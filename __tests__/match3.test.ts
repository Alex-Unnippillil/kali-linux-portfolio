import {
  findMatches,
  swapPieces,
  rngFactory,
  initializeBoard,
  hasValidMove,
  resolveBoard,
} from '@components/apps/match3';
import type { Board, Piece, PieceType } from '@components/apps/match3';

const make = (color: string, type: PieceType = 'normal'): Piece => ({
  color,
  type,
  id: Math.random(),
});

const fromArray = (arr: (Piece | null)[][]): Board => {
  const size = arr.length;
  const nodes = new Map<string, { x: number; y: number; piece: Piece | null }>();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      nodes.set(`${x},${y}`, { x, y, piece: arr[y][x] });
    }
  }
  return { size, nodes };
};

const simplify = (b: Board) =>
  Array.from({ length: b.size }).map((_, y) =>
    Array.from({ length: b.size }).map((_, x) => {
      const p = b.nodes.get(`${x},${y}`)?.piece;
      return p ? { c: p.color, t: p.type } : null;
    }),
  );

test('detects horizontal match of three', () => {
  const board = fromArray([
    [make('red'), make('red'), make('red')],
    [make('blue'), make('green'), make('yellow')],
    [make('blue'), make('green'), make('yellow')],
  ]);
  const matches = findMatches(board);
  expect(matches.size).toBe(3);
});

test('rejects non-adjacent swap', () => {
  const board = fromArray([
    [make('a'), make('b'), make('c')],
    [make('d'), make('e'), make('f')],
    [make('g'), make('h'), make('i')],
  ]);
  const res = swapPieces(board, { x: 0, y: 0 }, { x: 2, y: 2 });
  expect(res.swapped).toBe(false);
});

test('swap with fixed seed is deterministic', () => {
  const arr = [
    [make('a'), make('a'), make('a'), make('b')],
    [make('c'), make('d'), make('e'), make('f')],
    [make('g'), make('h'), make('i'), make('j')],
    [make('k'), make('l'), make('m'), make('n')],
  ];
  const board = fromArray(arr);
  const board2 = fromArray(arr);
  const seed = 42;
  const res1 = swapPieces(board, { x: 0, y: 0 }, { x: 1, y: 0 }, rngFactory(seed));
  const res2 = swapPieces(board2, { x: 0, y: 0 }, { x: 1, y: 0 }, rngFactory(seed));
  expect(simplify(res1.board)).toEqual(simplify(res2.board));
});

test('initialized board has no matches and at least one move', () => {
  const { board } = initializeBoard(8, 123);
  expect(findMatches(board).size).toBe(0);
  expect(hasValidMove(board)).toBe(true);
});

test('detects absence of valid moves', () => {
  const board = fromArray([
    [make('#ff6666'), make('#66b3ff')],
    [make('#66ff66'), make('#ffcc66')],
  ]);
  expect(hasValidMove(board)).toBe(false);
});

test('resolves cascades with multiple chains', () => {
  const red = '#ff6666';
  const blue = '#66b3ff';
  const purple = '#cc66ff';
  const board = fromArray([
    [make(blue), make(blue), make(blue)],
    [make(red), make(red), make(purple)],
    [make(red), make(red), make(purple)],
  ]);
  const res = resolveBoard(board, () => 0);
  expect(res.chain).toBeGreaterThan(1);
});

test('special tile clears entire row', () => {
  const red = '#ff6666';
  const blue = '#66b3ff';
  const purple = '#cc66ff';
  const board = fromArray([
    [make(red, 'stripedH'), make(blue), make(purple)],
    [make(blue), make(purple), make(red)],
    [make(purple), make(red), make(blue)],
  ]);
  const res = swapPieces(board, { x: 0, y: 0 }, { x: 1, y: 0 }, () => 0);
  const row0 = Array.from({ length: res.board.size }).map(
    (_, x) => res.board.nodes.get(`${x},0`)?.piece?.color,
  );
  expect(new Set(row0).size).toBe(1);
});
