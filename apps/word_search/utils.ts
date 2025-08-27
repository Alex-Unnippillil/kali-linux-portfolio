import type { Position } from './types';

export function key(p: Position) {
  return `${p.row}-${p.col}`;
}

export function computePath(start: Position, end: Position): Position[] {
  const dx = Math.sign(end.col - start.col);
  const dy = Math.sign(end.row - start.row);
  const len = Math.max(Math.abs(end.col - start.col), Math.abs(end.row - start.row));
  if (dx !== 0 && dy !== 0 && Math.abs(end.col - start.col) !== Math.abs(end.row - start.row)) {
    return [start];
  }
  const path: Position[] = [];
  for (let i = 0; i <= len; i += 1) {
    path.push({ row: start.row + dy * i, col: start.col + dx * i });
  }
  return path;
}
