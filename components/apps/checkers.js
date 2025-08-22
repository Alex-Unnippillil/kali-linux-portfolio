import React, { useState } from 'react';

const createBoard = () => {
  const board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'black', king: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: 'red', king: false };
    }
  }
  return board;
};

const directions = {
  red: [
    [1, -1],
    [1, 1],
  ],
  black: [
    [-1, -1],
    [-1, 1],
  ],
};

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

const getMoves = (board, r, c) => {
  const piece = board[r][c];
  if (!piece) return [];
  const dirs = [...directions[piece.color]];
  if (piece.king) dirs.push(...directions[piece.color === 'red' ? 'black' : 'red']);
  const moves = [];
  for (const [dr, dc] of dirs) {
    const r1 = r + dr;
    const c1 = c + dc;
    if (!inBounds(r1, c1)) continue;
    if (!board[r1][c1]) {
      moves.push({ r: r1, c: c1 });
    } else if (board[r1][c1].color !== piece.color) {
      const r2 = r + dr * 2;
      const c2 = c + dc * 2;
      if (inBounds(r2, c2) && !board[r2][c2]) {
        moves.push({ r: r2, c: c2, capture: [r1, c1] });
      }
    }
  }
  return moves;
};

const hasMoves = (board, color) => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c].color === color && getMoves(board, r, c).length) {
        return true;
      }
    }
  }
  return false;
};

const Checkers = () => {
  const [board, setBoard] = useState(createBoard());
  const [turn, setTurn] = useState('red');
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState([]);
  const [winner, setWinner] = useState(null);

  const selectPiece = (r, c) => {
    const piece = board[r][c];
    if (winner || !piece || piece.color !== turn) return;
    const m = getMoves(board, r, c);
    setSelected({ r, c });
    setMoves(m);
  };

  const tryMove = (r, c) => {
    const move = moves.find((m) => m.r === r && m.c === c);
    if (!move) return;
    const newBoard = board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    const piece = newBoard[selected.r][selected.c];
    newBoard[selected.r][selected.c] = null;
    newBoard[r][c] = piece;
    if (move.capture) {
      const [cr, cc] = move.capture;
      newBoard[cr][cc] = null;
    }
    if (
      !piece.king &&
      ((piece.color === 'red' && r === 7) || (piece.color === 'black' && r === 0))
    ) {
      piece.king = true;
    }
    const further = move.capture
      ? getMoves(newBoard, r, c).filter((m) => m.capture)
      : [];
    setBoard(newBoard);
    if (move.capture && further.length) {
      setSelected({ r, c });
      setMoves(further);
      return;
    }
    const next = turn === 'red' ? 'black' : 'red';
    if (!hasMoves(newBoard, next)) {
      setWinner(turn);
    } else {
      setTurn(next);
    }
    setSelected(null);
    setMoves([]);
  };

  const reset = () => {
    setBoard(createBoard());
    setTurn('red');
    setSelected(null);
    setMoves([]);
    setWinner(null);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {winner && <div className="mb-2 text-xl">{winner} wins!</div>}
      <div className="grid grid-cols-8 gap-0">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isMove = moves.some((m) => m.r === r && m.c === c);
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => (selected ? tryMove(r, c) : selectPiece(r, c))}
                className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-400'
                } ${isMove ? 'ring-2 ring-yellow-300' : ''}`}
              >
                {cell && (
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${
                      cell.color === 'red' ? 'bg-red-500' : 'bg-black'
                    } ${cell.king ? 'border-4 border-yellow-300' : ''}`}
                  >
                    {cell.king && (
                      <span className="text-yellow-300 text-sm font-bold">K</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4">
        {winner ? (
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={reset}
          >
            Reset
          </button>
        ) : (
          <div>Turn: {turn}</div>
        )}
      </div>
    </div>
  );
};

export default Checkers;

