const SIZE = 4;

const slide = (row) => {
  const arr = row.filter((n) => n !== 0);
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return newRow;
};

const transpose = (board) => board[0].map((_, c) => board.map((row) => row[c]));
const flip = (board) => board.map((row) => [...row].reverse());

const moveLeft = (board) => board.map((row) => slide(row));
const moveRight = (board) => flip(moveLeft(flip(board)));
const moveUp = (board) => transpose(moveLeft(transpose(board)));
const moveDown = (board) => transpose(moveRight(transpose(board)));

const moves = {
  left: moveLeft,
  right: moveRight,
  up: moveUp,
  down: moveDown,
};

const evaluate = (board) => {
  let empty = 0;
  let max = 0;
  board.forEach((row) =>
    row.forEach((cell) => {
      if (cell === 0) empty++;
      if (cell > max) max = cell;
    })
  );
  return empty * 10 + max;
};

self.onmessage = (e) => {
  const { board } = e.data;
  let bestMove = 'left';
  let bestScore = -Infinity;
  Object.entries(moves).forEach(([dir, fn]) => {
    const moved = fn(board.map((row) => [...row]));
    if (JSON.stringify(moved) === JSON.stringify(board)) return;
    const score = evaluate(moved);
    if (score > bestScore) {
      bestScore = score;
      bestMove = dir;
    }
  });
  postMessage(bestMove);
};
