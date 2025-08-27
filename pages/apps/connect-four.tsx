import React, { useEffect, useRef, useState } from 'react';
import { ConnectFourAI } from '../../components/apps/connect-four';

const ROWS = 6;
const COLS = 7;

type Cell = 0 | 1 | 2; // 0 empty, 1 AI red, 2 human yellow
type Board = Cell[][];

const createBoard = (): Board => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));

const getValidRow = (board: Board, col: number) => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
};

const directions = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

const checkWin = (board: Board, row: number, col: number, color: Cell) => {
  for (const [dx, dy] of directions) {
    let count = 1;
    for (let i = 1; i < 4; i++) {
      const r = row + dy * i;
      const c = col + dx * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== color) break;
      count++;
    }
    for (let i = 1; i < 4; i++) {
      const r = row - dy * i;
      const c = col - dx * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== color) break;
      count++;
    }
    if (count >= 4) return true;
  }
  return false;
};

const isBoardFull = (board: Board) => board[0].every((v) => v !== 0);

const ConnectFourPage = () => {
  const [board, setBoard] = useState<Board>(createBoard());
  const [player, setPlayer] = useState<'ai' | 'human'>('ai');
  const [winner, setWinner] = useState<string | null>(null);
  const aiRef = useRef(new ConnectFourAI());

  // AI move effect
  useEffect(() => {
    if (player !== 'ai' || winner) return;
    const col = aiRef.current.bestMove();
    const row = getValidRow(board, col);
    if (row === -1) return;
    aiRef.current.play(col);
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = 1;
    setBoard(newBoard);
    if (checkWin(newBoard, row, col, 1)) {
      setWinner('AI');
    } else if (isBoardFull(newBoard)) {
      setWinner('draw');
    } else {
      setPlayer('human');
    }
  }, [player, board, winner]);

  const handleClick = (col: number) => {
    if (player !== 'human' || winner) return;
    if (!aiRef.current.canPlay(col)) return;
    const row = getValidRow(board, col);
    if (row === -1) return;
    aiRef.current.play(col);
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = 2;
    setBoard(newBoard);
    if (checkWin(newBoard, row, col, 2)) {
      setWinner('You');
    } else if (isBoardFull(newBoard)) {
      setWinner('draw');
    } else {
      setPlayer('ai');
    }
  };

  const reset = () => {
    setBoard(createBoard());
    aiRef.current.reset();
    setWinner(null);
    setPlayer('ai');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-ub-cool-grey text-white p-4">
      {winner && (
        <div className="mb-2">{winner === 'draw' ? 'Draw!' : `${winner} wins!`}</div>
      )}
      <div className="grid grid-cols-7 gap-1">
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className="h-10 w-10 flex items-center justify-center bg-blue-700 cursor-pointer"
              onClick={() => handleClick(cIdx)}
            >
              {cell !== 0 && (
                <div
                  className={`h-8 w-8 rounded-full ${
                    cell === 1 ? 'bg-red-500' : 'bg-yellow-400'
                  }`}
                />
              )}
            </div>
          ))
        )}
      </div>
      <button
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Restart
      </button>
    </div>
  );
};

export default ConnectFourPage;
