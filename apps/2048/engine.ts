export type Board = number[][];

export const slideRow = (row: number[]): number[] => {
  const size = row.length;
  const arr = row.filter((n) => n !== 0);
  for (let i = 0; i < arr.length - 1; i += 1) {
    if (arr[i] === arr[i + 1]) {
      arr[i] = arr[i]! * 2;

      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < size) newRow.push(0);
  return newRow;
};

export const flip = (board: Board): Board =>
  board.map((row) => [...row].reverse());

export const transpose = (board: Board): Board => {
  const firstRow = board[0];
  if (!firstRow) return [];
  return firstRow.map((_, c) => board.map((row) => row[c]!));
};

export const moveLeft = (board: Board): Board =>
  board.map((row) => slideRow(row));

export const moveRight = (board: Board): Board => flip(moveLeft(flip(board)));

export const moveUp = (board: Board): Board =>
  transpose(moveLeft(transpose(board)));

export const moveDown = (board: Board): Board =>
  transpose(moveRight(transpose(board)));

export const hasMoves = (board: Board): boolean => {
  const size = board.length;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const row = board[r]!;
      const v = row[c]!;
      if (v === 0) return true;
      if (c < size - 1 && v === row[c + 1]!) return true;
      if (r < size - 1 && v === board[r + 1]![c]!) return true;
    }
  }
  return false;
};

export const addRandomTile = (board: Board, rand: () => number): Board => {
  const empty: Array<[number, number]> = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    }),
  );
  if (empty.length === 0) return board.map((row) => [...row]);
  const [r, c] = empty[Math.floor(rand() * empty.length)]!;
  const newBoard = board.map((row) => [...row]);
  const row = newBoard[r];
  if (!row) return newBoard;
  row[c] = rand() < 0.9 ? 2 : 4;
  return newBoard;
};

export const checkHighest = (board: Board): number =>
  board.reduce((max, row) => Math.max(max, ...row), 0);
