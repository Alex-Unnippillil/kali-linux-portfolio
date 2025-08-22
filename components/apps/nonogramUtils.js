export const lineToClues = (line) => {
  const clues = [];
  let count = 0;
  line.forEach((cell) => {
    if (cell === 1) count += 1;
    else if (count) {
      clues.push(count);
      count = 0;
    }
  });
  if (count) clues.push(count);
  return clues.length ? clues : [];
};

export const evaluateLine = (line, clue) => {
  const clues = lineToClues(line);
  const solved = JSON.stringify(clues) === JSON.stringify(clue);
  let contradiction = false;
  for (let i = 0; i < clues.length; i++) {
    if (i >= clue.length || clues[i] > clue[i]) contradiction = true;
  }
  if (clues.length > clue.length) contradiction = true;
  return { solved, contradiction };
};

export const generateLinePatterns = (clue, length) => {
  if (!clue.length) return [Array(length).fill(0)];
  const [first, ...rest] = clue;
  const patterns = [];
  for (let offset = 0; offset <= length - first; offset++) {
    const head = Array(offset).fill(0).concat(Array(first).fill(1));
    if (rest.length) {
      const tails = generateLinePatterns(rest, length - offset - first - 1);
      tails.forEach((t) => patterns.push(head.concat([0], t)));
    } else if (head.length < length) {
      patterns.push(head.concat(Array(length - head.length).fill(0)));
    } else patterns.push(head);
  }
  return patterns;
};

export const getPossibleLineSolutions = (clue, line) => {
  const patterns = generateLinePatterns(clue, line.length);
  return patterns.filter((p) =>
    line.every((cell, i) =>
      cell === 1 ? p[i] === 1 : cell === -1 ? p[i] === 0 : true
    )
  );
};

export const findForcedCellsInLine = (clue, line) => {
  const solutions = getPossibleLineSolutions(clue, line);
  if (!solutions.length) return [];
  const forced = [];
  for (let i = 0; i < line.length; i++) {
    const val = solutions[0][i];
    if (
      solutions.every((s) => s[i] === val) &&
      (line[i] === 0 || line[i] === 2)
    ) {
      forced.push({ index: i, value: val ? 1 : -1 });
    }
  }
  return forced;
};

export const findHint = (rows, cols, grid) => {
  for (let i = 0; i < rows.length; i++) {
    const forced = findForcedCellsInLine(rows[i], grid[i]).filter(
      (f) => f.value === 1
    );
    if (forced.length) return { i, j: forced[0].index, value: 1 };
  }
  for (let j = 0; j < cols.length; j++) {
    const col = grid.map((row) => row[j]);
    const forced = findForcedCellsInLine(cols[j], col).filter(
      (f) => f.value === 1
    );
    if (forced.length) return { i: forced[0].index, j, value: 1 };
  }
  return null;
};

export const autoFillLines = (grid, rows, cols) => {
  let changed = true;
  const g = grid.map((row) => row.slice());
  while (changed) {
    changed = false;
    rows.forEach((clue, i) => {
      const { solved } = evaluateLine(g[i], clue);
      if (solved) {
        for (let j = 0; j < g[i].length; j++) {
          if (g[i][j] === 0) {
            g[i][j] = -1;
            changed = true;
          }
        }
      }
    });
    cols.forEach((clue, j) => {
      const col = g.map((row) => row[j]);
      const { solved } = evaluateLine(col, clue);
      if (solved) {
        for (let i = 0; i < col.length; i++) {
          if (g[i][j] === 0) {
            g[i][j] = -1;
            changed = true;
          }
        }
      }
    });
  }
  return g;
};

export const validateSolution = (grid, rows, cols) => {
  const rowsValid = grid.every((row, i) =>
    JSON.stringify(lineToClues(row)) === JSON.stringify(rows[i])
  );
  const colsValid = cols.every((col, i) => {
    const column = grid.map((row) => row[i]);
    return JSON.stringify(lineToClues(column)) === JSON.stringify(col);
  });
  return rowsValid && colsValid;
};

const puzzles = [
  {
    rows: [[5], [5], [5], [5], [5]],
    cols: [[5], [5], [5], [5], [5]],
  },
  {
    rows: [[1], [3], [5], [3], [1]],
    cols: [[1], [3], [5], [3], [1]],
  },
  {
    rows: [[5], [1, 1], [1, 1, 1], [1, 1], [5]],
    cols: [[5], [1, 1], [1, 1, 1], [1, 1], [5]],
  },
];

export const getPuzzleBySeed = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return puzzles[hash % puzzles.length];
};

const nonogramUtils = {
  lineToClues,
  evaluateLine,
  generateLinePatterns,
  getPossibleLineSolutions,
  findForcedCellsInLine,
  findHint,
  autoFillLines,
  validateSolution,
  getPuzzleBySeed,
};

export default nonogramUtils;
