const SIZE = 4;

export const slideRow = (row: number[]) => {
  const arr = row.filter((n) => n !== 0);
  for (let i = 0; i < arr.length - 1; i += 1) {
    const current = arr[i]!;
    const next = arr[i + 1]!;
    if (current === next) {
      arr[i] = current * 2;
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return newRow;
};

export const transpose = (board: number[][]): number[][] => {
  if (board.length === 0) return [];
  return board[0].map((_, c) => board.map((row) => row[c]));
};

export const hasMoves = (board: number[][]) => {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) return true;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

export default { slideRow, transpose, hasMoves };
