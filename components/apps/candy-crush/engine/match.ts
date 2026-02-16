import type { Board, Coord, MatchGroup } from './types';
import { cloneBoard, isAdjacent, canOccupy } from './board';

const key = ({ r, c }: Coord) => `${r}:${c}`;

const getBaseColor = (board: Board, r: number, c: number) => {
  const candy = board.cells[r]?.[c]?.candy;
  return candy?.kind === 'colorBomb' ? null : candy?.color ?? null;
};

export const detectMatches = (board: Board): MatchGroup[] => {
  const rows = board.rows;
  const cols = board.cols;
  const map = new Map<string, { color: NonNullable<ReturnType<typeof getBaseColor>>; cells: Set<string>; rowRun: number; colRun: number }>();

  for (let r = 0; r < rows; r += 1) {
    let c = 0;
    while (c < cols) {
      const color = getBaseColor(board, r, c);
      if (!color) {
        c += 1;
        continue;
      }
      let end = c + 1;
      while (end < cols && getBaseColor(board, r, end) === color) end += 1;
      if (end - c >= 3) {
        for (let k = c; k < end; k += 1) {
          const id = key({ r, c: k });
          if (!map.has(id)) map.set(id, { color, cells: new Set(), rowRun: 0, colRun: 0 });
          const entry = map.get(id)!;
          for (let i = c; i < end; i += 1) entry.cells.add(key({ r, c: i }));
          entry.rowRun = Math.max(entry.rowRun, end - c);
        }
      }
      c = end;
    }
  }

  for (let c = 0; c < cols; c += 1) {
    let r = 0;
    while (r < rows) {
      const color = getBaseColor(board, r, c);
      if (!color) {
        r += 1;
        continue;
      }
      let end = r + 1;
      while (end < rows && getBaseColor(board, end, c) === color) end += 1;
      if (end - r >= 3) {
        for (let k = r; k < end; k += 1) {
          const id = key({ r: k, c });
          if (!map.has(id)) map.set(id, { color, cells: new Set(), rowRun: 0, colRun: 0 });
          const entry = map.get(id)!;
          for (let i = r; i < end; i += 1) entry.cells.add(key({ r: i, c }));
          entry.colRun = Math.max(entry.colRun, end - r);
        }
      }
      r = end;
    }
  }

  const visited = new Set<string>();
  const groups: MatchGroup[] = [];

  for (const [id, entry] of map.entries()) {
    if (visited.has(id)) continue;
    const queue = [id];
    const comp = new Set<string>();
    let rowRun = 0;
    let colRun = 0;
    while (queue.length) {
      const cur = queue.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      comp.add(cur);
      const e = map.get(cur);
      if (!e) continue;
      rowRun = Math.max(rowRun, e.rowRun);
      colRun = Math.max(colRun, e.colRun);
      for (const neighbor of e.cells) if (!visited.has(neighbor) && map.has(neighbor)) queue.push(neighbor);
    }
    const cells = [...comp].map((v) => {
      const [r, c] = v.split(':').map(Number);
      return { r, c };
    });
    groups.push({
      cells,
      color: entry.color,
      rowRun,
      colRun,
      isLine4: rowRun === 4 || colRun === 4,
      isLine5: rowRun >= 5 || colRun >= 5,
      isTOrL: cells.length >= 5 && rowRun >= 3 && colRun >= 3,
    });
  }

  return groups;
};

const swap = (board: Board, a: Coord, b: Coord) => {
  const tmp = board.cells[a.r][a.c].candy;
  board.cells[a.r][a.c].candy = board.cells[b.r][b.c].candy;
  board.cells[b.r][b.c].candy = tmp;
};

export const validateSwap = (board: Board, a: Coord, b: Coord) => {
  if (!isAdjacent(a, b) || !canOccupy(board, a) || !canOccupy(board, b)) return false;
  const cloned = cloneBoard(board);
  swap(cloned, a, b);
  return detectMatches(cloned).length > 0;
};

export const hasAnyLegalMove = (board: Board) => {
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const cur = { r, c };
      const right = { r, c: c + 1 };
      const down = { r: r + 1, c };
      if (board.cells[r][c].hole || board.cells[r][c].ice > 0) continue;
      if (board.cells[r]?.[c + 1] && validateSwap(board, cur, right)) return true;
      if (board.cells[r + 1]?.[c] && validateSwap(board, cur, down)) return true;
    }
  }
  return false;
};
