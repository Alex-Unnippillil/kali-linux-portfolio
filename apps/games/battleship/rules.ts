export type Direction = 0 | 1;
export type BoardCell = 'ship' | 'hit' | 'miss' | null;

export const toIdx = (x: number, y: number, size: number) => y * size + x;

export const toXY = (idx: number, size: number) => ({ x: idx % size, y: Math.floor(idx / size) });

export const inBounds = (x: number, y: number, size: number) =>
  x >= 0 && y >= 0 && x < size && y < size;

export const cellsForShip = (
  x: number,
  y: number,
  dir: Direction,
  len: number,
  size: number,
): number[] | null => {
  const cells: number[] = [];
  for (let i = 0; i < len; i++) {
    const cx = x + (dir === 0 ? i : 0);
    const cy = y + (dir === 1 ? i : 0);
    if (!inBounds(cx, cy, size)) return null;
    cells.push(toIdx(cx, cy, size));
  }
  return cells;
};

export const getRing = (cells: number[], size: number, includeDiagonals = true) => {
  const deltas = includeDiagonals
    ? [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ]
    : [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ];
  const result = new Set<number>();
  cells.forEach((idx) => {
    const { x, y } = toXY(idx, size);
    deltas.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, size)) return;
      const nIdx = toIdx(nx, ny, size);
      if (!cells.includes(nIdx)) {
        result.add(nIdx);
      }
    });
  });
  return Array.from(result);
};

export const isShipSunk = (board: BoardCell[], shipCells: number[]) =>
  shipCells.every((c) => board[c] === 'hit');

export type Placement = {
  id?: number;
  x: number;
  y: number;
  dir: Direction;
  len: number;
  cells: number[];
};

export const validatePlacement = (
  layout: Placement[],
  options: { size: number; noTouch: boolean },
): { ok: true } | { ok: false; reason: string } => {
  const { size, noTouch } = options;
  const occupied = new Set<number>();

  for (const ship of layout) {
    if (!ship?.cells?.length) continue;
    if (ship.cells.length !== ship.len) {
      return { ok: false, reason: 'length-mismatch' };
    }
    for (const cell of ship.cells) {
      const { x, y } = toXY(cell, size);
      if (!inBounds(x, y, size)) return { ok: false, reason: 'out-of-bounds' };
      if (occupied.has(cell)) return { ok: false, reason: 'overlap' };
      occupied.add(cell);
    }
  }

  if (noTouch) {
    const rings = new Set<number>();
    layout.forEach((ship) => {
      if (!ship?.cells?.length) return;
      getRing(ship.cells, size).forEach((cell) => rings.add(cell));
    });
    for (const ship of layout) {
      if (!ship?.cells?.length) continue;
      for (const cell of ship.cells) {
        if (rings.has(cell)) return { ok: false, reason: 'adjacent' };
      }
    }
  }

  return { ok: true };
};
