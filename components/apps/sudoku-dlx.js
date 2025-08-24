const SIZE = 9;
const BOX_SIZE = 3;
const CONSTRAINTS = SIZE * SIZE * 4;

class Column {
  constructor(name) {
    this.name = name;
    this.size = 0;
    this.left = this;
    this.right = this;
    this.up = this;
    this.down = this;
  }
}

function linkHorizontal(nodes) {
  const len = nodes.length;
  for (let i = 0; i < len; i += 1) {
    nodes[i].right = nodes[(i + 1) % len];
    nodes[i].left = nodes[(i + len - 1) % len];
  }
}

function cover(col) {
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

function uncover(col) {
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

function buildDLX(board) {
  const header = new Column(-1);
  const columns = Array.from({ length: CONSTRAINTS }, (_, i) => new Column(i));
  columns.reduce((prev, curr) => {
    prev.right = curr;
    curr.left = prev;
    return curr;
  }, header).right = header;
  header.left = columns[columns.length - 1];

  const rowData = [];
  const optionMap = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Array(SIZE + 1).fill(null))
  );

  function addRow(r, c, n) {
    const colIndices = [
      r * SIZE + c,
      SIZE * SIZE + r * SIZE + (n - 1),
      SIZE * SIZE * 2 + c * SIZE + (n - 1),
      SIZE * SIZE * 3 +
        (Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE)) * SIZE +
        (n - 1),
    ];
    const nodes = colIndices.map((idx) => {
      const column = columns[idx];
      const node = {
        left: null,
        right: null,
        up: column.up,
        down: column,
        column,
        row: rowData.length,
      };
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

function search(header, solution, results, limit) {
  if (header.right === header) {
    results.push([...solution]);
    return results.length >= limit;
  }
  let col = header.right;
  for (let c = col.right; c !== header; c = c.right) {
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

function searchRandom(header, solution, results, limit, rng) {
  if (header.right === header) {
    results.push([...solution]);
    return results.length >= limit;
  }
  let col = header.right;
  for (let c = col.right; c !== header; c = c.right) {
    if (c.size < col.size) col = c;
  }
  cover(col);
  const rows = [];
  for (let row = col.down; row !== col; row = row.down) rows.push(row);
  for (let i = rows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  for (const row of rows) {
    solution.push(row);
    for (let node = row.right; node !== row; node = node.right) {
      cover(node.column);
    }
    if (searchRandom(header, solution, results, limit, rng)) return true;
    for (let node = row.left; node !== row; node = node.left) {
      uncover(node.column);
    }
    solution.pop();
  }
  uncover(col);
  return false;
}

export function solve(board) {
  const { header, rowData } = buildDLX(board);
  const solutions = [];
  search(header, [], solutions, 1);
  if (solutions.length === 0) return null;
  const result = board.map((row) => [...row]);
  for (const node of solutions[0]) {
    const info = rowData[node.row];
    result[info.r][info.c] = info.n;
  }
  return result;
}

export function solveRandom(board, rng = Math.random) {
  const { header, rowData } = buildDLX(board);
  const solutions = [];
  searchRandom(header, [], solutions, 1, rng);
  if (solutions.length === 0) return null;
  const result = board.map((row) => [...row]);
  for (const node of solutions[0]) {
    const info = rowData[node.row];
    result[info.r][info.c] = info.n;
  }
  return result;
}

export function countSolutions(board, limit = 2) {
  const { header } = buildDLX(board);
  const solutions = [];
  search(header, [], solutions, limit);
  return solutions.length;
}

export function isValid(board, row, col, val) {
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
