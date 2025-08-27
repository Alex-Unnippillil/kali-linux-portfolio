import React, { useState } from 'react';
import GameLayout from './GameLayout';

const size = 4;

const index = (x, y, z) => z * size * size + y * size + x;

const generateWinningLines3D = () => {
  const dirs = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, -1, 0],
    [1, 0, 1],
    [1, 0, -1],
    [0, 1, 1],
    [0, 1, -1],
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
  ];
  const lines = [];
  const seen = new Set();
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        dirs.forEach(([dx, dy, dz]) => {
          const line = [];
          for (let i = 0; i < size; i++) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            const nz = z + dz * i;
            if (nx < 0 || ny < 0 || nz < 0 || nx >= size || ny >= size || nz >= size) {
              break;
            }
            line.push(index(nx, ny, nz));
          }
          if (line.length === size) {
            const key = line.sort((a, b) => a - b).join('-');
            if (!seen.has(key)) {
              seen.add(key);
              lines.push(line);
            }
          }
        });
      }
    }
  }
  return lines;
};

const winningLines3D = generateWinningLines3D();

export const checkWinner3D = (board) => {
  for (const line of winningLines3D) {
    const [a, b, c, d] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c] && board[a] === board[d]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
};

const TicTacToe3D = () => {
  const [board, setBoard] = useState(Array(size * size * size).fill(null));
  const [player, setPlayer] = useState('X');
  const [status, setStatus] = useState('X to move');
  const [winningLine, setWinningLine] = useState([]);

  const handleClick = (idx) => {
    if (board[idx] || checkWinner3D(board).winner) return;
    const newBoard = board.slice();
    newBoard[idx] = player;
    setBoard(newBoard);
    const { winner, line } = checkWinner3D(newBoard);
    if (winner) {
      setWinningLine(line);
      setStatus(winner === 'draw' ? 'Draw!' : `${winner} wins!`);
    } else {
      const next = player === 'X' ? 'O' : 'X';
      setPlayer(next);
      setStatus(`${next} to move`);
    }
  };

  const restart = () => {
    setBoard(Array(size * size * size).fill(null));
    setPlayer('X');
    setStatus('X to move');
    setWinningLine([]);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="relative mb-4" style={{ width: 220, height: 220 }}>
        {Array.from({ length: size }).map((_, layer) => (
          <div
            key={layer}
            className="grid grid-cols-4 gap-1 absolute"
            style={{ top: layer * 10, left: layer * 10 }}
          >
            {board.slice(layer * 16, layer * 16 + 16).map((cell, i) => {
              const idx = layer * 16 + i;
              return (
                <button
                  key={idx}
                  className={`h-10 w-10 text-xl flex items-center justify-center bg-gray-700 hover:bg-gray-600 ${
                    winningLine.includes(idx) ? 'bg-green-600 animate-pulse' : ''
                  }`}
                  onClick={() => handleClick(idx)}
                >
                  {cell}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mb-4">{status}</div>
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={restart}
      >
        Restart
      </button>
    </div>
  );
};

export default function TicTacToe3DApp() {
  return (
    <GameLayout gameId="tictactoe-3d">
      <TicTacToe3D />
    </GameLayout>
  );
}

