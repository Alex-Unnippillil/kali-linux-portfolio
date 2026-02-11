import type { Board, CandyKind, Color, Coord, MatchGroup } from './types';

const coordEq = (a: Coord, b: Coord) => a.r === b.r && a.c === b.c;

export const specialFromMatch = (group: MatchGroup): CandyKind | null => {
  if (group.isLine5) return 'colorBomb';
  if (group.isTOrL) return 'wrapped';
  if (group.isLine4) return group.rowRun === 4 ? 'stripedH' : 'stripedV';
  return null;
};

export const triggerSpecialAt = (board: Board, at: Coord): Coord[] => {
  const candy = board.cells[at.r]?.[at.c]?.candy;
  if (!candy) return [];
  if (candy.kind === 'stripedH') return Array.from({ length: board.cols }, (_, c) => ({ r: at.r, c }));
  if (candy.kind === 'stripedV') return Array.from({ length: board.rows }, (_, r) => ({ r, c: at.c }));
  if (candy.kind === 'wrapped') {
    const cells: Coord[] = [];
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) cells.push({ r: at.r + dr, c: at.c + dc });
    return cells;
  }
  if (candy.kind === 'colorBomb') return [{ ...at }];
  return [at];
};

export const resolveCombo = (board: Board, a: Coord, b: Coord): { cells: Coord[]; transformColor?: Color; transformKind?: CandyKind } | null => {
  const ca = board.cells[a.r]?.[a.c]?.candy;
  const cb = board.cells[b.r]?.[b.c]?.candy;
  if (!ca || !cb) return null;

  if (ca.kind === 'colorBomb' && cb.kind === 'colorBomb') {
    return {
      cells: Array.from({ length: board.rows }, (_, r) => Array.from({ length: board.cols }, (_, c) => ({ r, c }))).flat(),
    };
  }

  if (ca.kind === 'stripedH' && cb.kind === 'stripedV' || ca.kind === 'stripedV' && cb.kind === 'stripedH') {
    return {
      cells: [...Array.from({ length: board.cols }, (_, c) => ({ r: b.r, c })), ...Array.from({ length: board.rows }, (_, r) => ({ r, c: b.c }))],
    };
  }

  if (ca.kind === 'wrapped' && cb.kind === 'wrapped') {
    const cells: Coord[] = [];
    for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) cells.push({ r: b.r + dr, c: b.c + dc });
    return { cells };
  }

  const colorBomb = ca.kind === 'colorBomb' ? ca : cb.kind === 'colorBomb' ? cb : null;
  const other = colorBomb === ca ? cb : ca;
  if (colorBomb && other.color) {
    if (other.kind === 'normal') {
      return {
        cells: Array.from({ length: board.rows }, (_, r) =>
          Array.from({ length: board.cols }, (_, c) => ({ r, c })).filter(({ r: rr, c: cc }) => board.cells[rr][cc].candy?.color === other.color),
        ).flat(),
      };
    }
    if (other.kind === 'stripedH' || other.kind === 'stripedV') {
      return { cells: [], transformColor: other.color, transformKind: 'stripedH' };
    }
    if (other.kind === 'wrapped') {
      return { cells: [], transformColor: other.color, transformKind: 'wrapped' };
    }
  }

  return null;
};

export const pickCreationCell = (group: MatchGroup, a: Coord, b: Coord) => {
  if (group.cells.some((cell) => coordEq(cell, b))) return b;
  if (group.cells.some((cell) => coordEq(cell, a))) return a;
  return group.cells[0];
};
