import { BOARD_SIZE, SHIPS, Layout } from './ai';

export const LAYOUT_STORAGE_KEY = 'battleship:layout';

export type Orientation = 0 | 1;

export interface StoredShipPlacement {
  len: number;
  x: number;
  y: number;
  dir: Orientation;
}

export type StoredLayout = StoredShipPlacement[];

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const expectedLengths = (() => {
  const sorted = [...SHIPS].sort((a, b) => a - b);
  return sorted.join(',');
})();

function getStorage(storage?: StorageLike) {
  if (storage) return storage;
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const ORIENTATION: Orientation[] = [0, 1];

const toInt = (value: unknown): number =>
  typeof value === 'number' ? value : Number.parseInt(String(value ?? 0), 10);

export function computeCells(ship: StoredShipPlacement): number[] {
  const cells: number[] = [];
  for (let i = 0; i < ship.len; i += 1) {
    const cx = ship.x + (ship.dir === 0 ? i : 0);
    const cy = ship.y + (ship.dir === 1 ? i : 0);
    if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) {
      return [];
    }
    cells.push(cy * BOARD_SIZE + cx);
  }
  return cells;
}

function sanitizePlacement(ship: any): StoredShipPlacement {
  return {
    len: toInt(ship?.len),
    x: toInt(ship?.x),
    y: toInt(ship?.y),
    dir: ORIENTATION.includes(ship?.dir) ? (ship.dir as Orientation) : 0,
  };
}

function sameLengths(layout: StoredLayout) {
  const sorted = layout.map((ship) => ship.len).sort((a, b) => a - b);
  return sorted.join(',') === expectedLengths;
}

function hasOverlapOrAdjacency(
  cells: number[],
  occupied: Set<number>,
): boolean {
  for (const idx of cells) {
    if (occupied.has(idx)) return true;
    const cx = idx % BOARD_SIZE;
    const cy = Math.floor(idx / BOARD_SIZE);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) continue;
        const nIdx = ny * BOARD_SIZE + nx;
        if (occupied.has(nIdx)) return true;
      }
    }
  }
  return false;
}

export function isValidLayout(layout: unknown): layout is StoredLayout {
  if (!Array.isArray(layout) || layout.length !== SHIPS.length) {
    return false;
  }
  const placements = layout.map(sanitizePlacement);
  if (!sameLengths(placements)) return false;
  const occupied = new Set<number>();
  for (const ship of placements) {
    if (!Number.isFinite(ship.x) || !Number.isFinite(ship.y)) return false;
    if (!Number.isFinite(ship.len) || ship.len <= 0) return false;
    if (!ORIENTATION.includes(ship.dir)) return false;
    const cells = computeCells(ship);
    if (cells.length !== ship.len) return false;
    if (hasOverlapOrAdjacency(cells, occupied)) return false;
    cells.forEach((c) => occupied.add(c));
  }
  return true;
}

export function normalizeLayout(layout: unknown): StoredLayout | null {
  if (!Array.isArray(layout)) return null;
  const placements = layout.map(sanitizePlacement);
  return isValidLayout(placements) ? placements : null;
}

export function serializeShips(
  ships: Array<{
    len: number;
    x: number;
    y: number;
    dir: Orientation;
  }>,
): StoredLayout {
  return ships.map((ship) => ({
    len: ship.len,
    x: ship.x,
    y: ship.y,
    dir: ship.dir,
  }));
}

export function expandLayout(layout: StoredLayout): Layout[] {
  return layout.map((ship) => ({
    x: ship.x,
    y: ship.y,
    dir: ship.dir,
    len: ship.len,
    cells: computeCells(ship),
  }));
}

export function saveLayout(
  layout: StoredLayout,
  storage?: StorageLike,
): void {
  if (!isValidLayout(layout)) {
    throw new Error('Invalid layout');
  }
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore storage failures
  }
}

export function loadLayout(storage?: StorageLike): StoredLayout | null {
  const target = getStorage(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeLayout(parsed);
  } catch {
    return null;
  }
}

export function clearLayout(storage?: StorageLike): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.removeItem(LAYOUT_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
