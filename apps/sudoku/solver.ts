import type { Board, Hint } from './types';

// Dancing Links implementation of Algorithm X for Sudoku

const SIZE = 9;
const BOX_SIZE = 3;
const CONSTRAINTS = SIZE * SIZE * 4; // 324 columns

interface Node {
  left: Node;
  right: Node;
  up: Node;
  down: Node;
  column: Column;
  row?: number; // index into rowData
}

class Column {
  left: Column;
  right: Column;
  up: Node;
  down: Node;
  size = 0;
  name: number;

  constructor(name: number) {
    this.name = name;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.left = this.right = this as unknown as Column;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.up = this.down = this as unknown as Node;
  }
}

interface RowInfo {
  r: number;
  c: number;
  n: number;
}

function linkHorizontal(nodes: Node[]): void {
  const len = nodes.length;
  for (let i = 0; i < len; i += 1) {
    nodes[i].right = nodes[(i + 1) % len];
    nodes[i].left = nodes[(i + len - 1) % len];
  }
}

function cover(col: Column): void {
  col.right.left = col.left;
  col.left.right = col.right;
  for (let row = col.down; row !== col; row = row.down) {
    for (let node = row.right; node !== row; node = node.right) {
      node.down.up = node.up;
      node.up.down = node.down;
      node.column.size -= 1;
    }
  }
}

function uncover(col: Column): void {
  for (let row = col.up; row !== col; row = row.up) {
    for (let node = row.left; node !== row; node = node.left) {
      node.column.size += 1;
      node.down.up = node;
      node.up.down = node;
    }
  }
  col.right.left = col;
  col.left.right = col;
}

function search(
  header: Column,
  solution: Node[],
  results: Node[][],
  limit: number
): boolean {
  if (header.right === header) {
    results.push([...solution]);
    return results.length >= limit;
  }
  // choose column with smallest size
  let col = header.right as Column;
  for (let c = col.right as Column; c !== header; c = c.right as Column) {
    if (c.size < col.size) col = c;
  }
  cover(col);
  for (let row = col.down; row !== col; row = row.down) {
    solution.push(row);
    for (let node = row.right; node !== row; node = node.right) {
      cover(node.column);
    }
    if (search(header, solution, results, limit)) return true;
    for (let node = row.left; node !== row; node = node.left) {
      uncover(node.column);
    }
    solution.pop();
  }
  uncover(col);
  return false;
}

function buildDLX(board: Board) {
  const header = new Column(-1);
  const columns: Column[] = Array.from(
    { length: CONSTRAINTS },
    (_, i) => new Column(i)
  );
  // link columns horizontally
  columns.reduce((prev, curr) => {
    prev.right = curr;
    curr.left = prev;
    return curr;
  }, header).right = header;
  header.left = columns[columns.length - 1];

  const rowData: RowInfo[] = [];
  const optionMap: Node[][][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Array(SIZE + 1).fill(null))
  );

  function addRow(r: number, c: number, n: number) {
    const colIndices = [
      r * SIZE + c,
      SIZE * SIZE + r * SIZE + (n - 1),
      SIZE * SIZE * 2 + c * SIZE + (n - 1),
      SIZE * SIZE * 3 +
        (Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE)) * SIZE +
        (n - 1),
    ];
    const nodes: Node[] = colIndices.map((idx) => {
      const column = columns[idx];
      const node: Node = { left: null as any, right: null as any, up: column.up, down: column, column, row: rowData.length };
      column.up.down = node;
      column.up = node;
      column.size += 1;
      return node;
    });
    linkHorizontal(nodes);
    rowData.push({ r, c, n });
    optionMap[r][c][n] = nodes[0];
  }

  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) {
        for (let n = 1; n <= SIZE; n += 1) {
          addRow(r, c, n);
        }
      } else {
        addRow(r, c, board[r][c]);
      }
    }
  }

  // cover givens
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const n = board[r][c];
      if (n !== 0) {
        const rowNode = optionMap[r][c][n];
        if (!rowNode) continue;
        for (let node = rowNode; ; node = node.right) {
          cover(node.column);
          if (node.right === rowNode) break;
        }
      }
    }
  }

  return { header, rowData };
}

export function solve(board: Board): Board | null {
  const { header, rowData } = buildDLX(board);
  const solutions: Node[][] = [];
  search(header, [], solutions, 1);
  if (solutions.length === 0) return null;
  const result = board.map((row) => [...row]);
  for (const node of solutions[0]) {
    const info = rowData[node.row!];
    result[info.r][info.c] = info.n;
  }
  return result;
}

export function countSolutions(board: Board, limit = 2): number {
  const { header } = buildDLX(board);
  const solutions: Node[][] = [];
  search(header, [], solutions, limit);
  return solutions.length;
}

// Solver running in Web Worker
export function solveAsync(board: Board): Promise<Board | null> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./solver.worker.ts', import.meta.url));
    worker.onmessage = (e) => {
      if (e.data.type === 'solve') {
        resolve(e.data.solution as Board | null);
        worker.terminate();
      }
    };
    worker.postMessage({ type: 'solve', board });
  });
}

export function getHintAsync(board: Board): Promise<Hint | null> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./solver.worker.ts', import.meta.url));
    worker.onmessage = (e) => {
      if (e.data.type === 'hint') {
        resolve(e.data.hint as Hint | null);
        worker.terminate();
      }
    };
    worker.postMessage({ type: 'hint', board });
  });
}

export function isValid(board: Board, row: number, col: number, val: number): boolean {
  for (let i = 0; i < SIZE; i += 1) {
    if (board[row][i] === val || board[i][col] === val) return false;
  }
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = 0; r < BOX_SIZE; r += 1) {
    for (let c = 0; c < BOX_SIZE; c += 1) {
      if (board[boxRow + r][boxCol + c] === val) return false;
    }
  }
  return true;
}
