export interface NonogramPuzzle {
  width: number;
  height: number;
  rows: number[][];
  cols: number[][];
}

export function parseNON(text: string): NonogramPuzzle {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new Error('Empty file');
  }
  const [wStr, hStr] = lines.shift()!.split(/\s+/);
  const width = parseInt(wStr, 10);
  const height = parseInt(hStr, 10);
  const rows: number[][] = [];
  const cols: number[][] = [];
  for (let i = 0; i < height; i += 1) {
    const line = lines.shift() || '';
    const nums = line
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => parseInt(n, 10));
    rows.push(nums);
  }
  for (let i = 0; i < width; i += 1) {
    const line = lines.shift() || '';
    const nums = line
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => parseInt(n, 10));
    cols.push(nums);
  }
  return { width, height, rows, cols };
}
