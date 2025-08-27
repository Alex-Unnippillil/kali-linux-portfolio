const digits = '123456789';
const rows = 'ABCDEFGHI';
const cols = digits;

const cross = (a: string, b: string): string[] => {
  const result: string[] = [];
  for (const x of a) {
    for (const y of b) result.push(x + y);
  }
  return result;
};

const squares = cross(rows, cols);

const unitList: string[][] = [];
for (const r of rows) unitList.push(cross(r, cols));
for (const c of cols) unitList.push(cross(rows, c));
const rowBlocks = ['ABC', 'DEF', 'GHI'];
const colBlocks = ['123', '456', '789'];
for (const rs of rowBlocks) {
  for (const cs of colBlocks) unitList.push(cross(rs, cs));
}

const units: Record<string, string[][]> = {};
const peers: Record<string, Set<string>> = {};
for (const s of squares) {
  units[s] = unitList.filter((u) => u.includes(s));
  const p = new Set<string>();
  for (const u of units[s]) {
    for (const s2 of u) if (s2 !== s) p.add(s2);
  }
  peers[s] = p;
}

export interface Step {
  square: string;
  value: string;
  technique: string;
}

const gridValues = (grid: string): Record<string, string> => {
  const chars = grid.replace(/[^0-9\.]/g, '').split('');
  if (chars.length !== 81) throw new Error('Grid must be 81 chars');
  const res: Record<string, string> = {};
  squares.forEach((s, i) => (res[s] = chars[i] === '0' || chars[i] === '.' ? '.' : chars[i]));
  return res;
};

const assign = (
  values: Record<string, string>,
  s: string,
  d: string,
  steps?: Step[],
  technique = 'assign',
): Record<string, string> | false => {
  const other = values[s].replace(d, '');
  for (const d2 of other) {
    const res = eliminate(values, s, d2, steps);
    if (!res) return false;
  }
  if (steps && technique !== 'given') steps.push({ square: s, value: d, technique });
  return values;
};

const eliminate = (
  values: Record<string, string>,
  s: string,
  d: string,
  steps?: Step[],
): Record<string, string> | false => {
  if (!values[s].includes(d)) return values; // already eliminated
  values[s] = values[s].replace(d, '');
  if (values[s].length === 0) return false;
  if (values[s].length === 1) {
    const d2 = values[s];
    for (const s2 of peers[s]) {
      const res = eliminate(values, s2, d2, steps);
      if (!res) return false;
    }
    if (steps) steps.push({ square: s, value: d2, technique: 'single candidate' });
  }
  for (const u of units[s]) {
    const places = u.filter((s2) => values[s2].includes(d));
    if (places.length === 0) return false;
    if (places.length === 1) {
      if (!assign(values, places[0], d, steps, 'hidden single')) return false;
    }
  }
  return values;
};

const parseGrid = (grid: string, steps?: Step[]): Record<string, string> | false => {
  const values: Record<string, string> = {};
  squares.forEach((s) => (values[s] = digits));
  const gridVals = gridValues(grid);
  for (const s of squares) {
    const d = gridVals[s];
    if (digits.includes(d)) {
      if (!assign(values, s, d, steps, 'given')) return false;
    }
  }
  return values;
};

const solved = (values: Record<string, string>): boolean => squares.every((s) => values[s].length === 1);

const deepCopy = (obj: Record<string, string>): Record<string, string> => {
  const res: Record<string, string> = {};
  for (const k in obj) res[k] = obj[k];
  return res;
};

const search = (
  values: Record<string, string> | false,
  steps: Step[],
): Record<string, string> | false => {
  if (!values) return false;
  if (solved(values)) return values;
  let minSq: string | null = null;
  let minCount = 10;
  for (const s of squares) {
    const l = values[s].length;
    if (l > 1 && l < minCount) {
      minCount = l;
      minSq = s;
    }
  }
  if (!minSq) return false;
  for (const d of values[minSq]) {
    const snapshot = steps.length;
    steps.push({ square: minSq, value: d, technique: 'guess' });
    const newVals = search(assign(deepCopy(values), minSq, d, steps, 'guess'), steps);
    if (newVals) return newVals;
    steps.splice(snapshot);
  }
  return false;
};

const stringToBoard = (grid: string): number[][] => {
  const board: number[][] = [];
  for (let r = 0; r < 9; r++) {
    board.push([]);
    for (let c = 0; c < 9; c++) {
      const ch = grid[r * 9 + c];
      board[r][c] = ch === '.' || ch === '0' ? 0 : parseInt(ch, 10);
    }
  }
  return board;
};

const boardToString = (board: number[][]): string => board.flat().map((n) => (n === 0 ? '.' : String(n))).join('');

const squareToIndices = (s: string): [number, number] => [rows.indexOf(s[0]), cols.indexOf(s[1])];

export const solve = (board: number[][]): { solution: number[][]; steps: Step[] } => {
  const grid = boardToString(board);
  const steps: Step[] = [];
  const values = parseGrid(grid, steps);
  if (!values) throw new Error('Invalid puzzle');
  const result = search(values, steps);
  if (!result) throw new Error('No solution');
  return { solution: stringToBoard(squares.map((s) => result[s]).join('')), steps };
};

export const ratePuzzle = (board: number[][]): { difficulty: string; steps: Step[] } => {
  const { steps } = solve(board);
  const guesses = steps.filter((s) => s.technique === 'guess').length;
  let difficulty: string;
  if (guesses === 0) difficulty = 'easy';
  else if (guesses < 3) difficulty = 'medium';
  else difficulty = 'hard';
  return { difficulty, steps };
};

export const getHint = (
  board: number[][],
):
  | { type: 'single'; r: number; c: number; value: number; technique: string }
  | { type: 'pair'; cells: { r: number; c: number }[]; values: number[]; technique: string }
  | null => {
  const grid = boardToString(board);
  const values = parseGrid(grid);
  if (!values) return null;
  for (const s of squares) {
    const [r, c] = squareToIndices(s);
    if (board[r][c] === 0 && values[s].length === 1) {
      return {
        type: 'single',
        r,
        c,
        value: parseInt(values[s], 10),
        technique: 'single candidate',
      };
    }
  }
  for (const u of unitList) {
    for (const d of digits) {
      const places = u.filter((s) => values[s].includes(d));
      if (places.length === 1) {
        const [r, c] = squareToIndices(places[0]);
        if (board[r][c] === 0) {
          return {
            type: 'single',
            r,
            c,
            value: parseInt(d, 10),
            technique: 'hidden single',
          };
        }
      }
    }
  }
  for (const u of unitList) {
    const pairSquares = u.filter((s) => values[s].length === 2);
    const seen: Record<string, string> = {};
    for (const s of pairSquares) {
      const val = values[s];
      if (seen[val]) {
        const other = seen[val];
        const [r1, c1] = squareToIndices(s);
        const [r2, c2] = squareToIndices(other);
        return {
          type: 'pair',
          cells: [
            { r: r1, c: c1 },
            { r: r2, c: c2 },
          ],
          values: val.split('').map((n) => parseInt(n, 10)),
          technique: 'naked pair',
        };
      }
      seen[val] = s;
    }
  }
  return null;
};

export const utils = { boardToString, stringToBoard };

export default { solve, ratePuzzle, getHint };
