import type { Position } from './types';

export function findWord(
  grid: string[][],
  words: string[],
  selection: Position[]
): string | null {
  const letters = selection.map((p) => grid[p.row][p.col]).join('');
  const reversed = letters.split('').reverse().join('');
  return words.find((w) => w === letters || w === reversed) || null;
}
