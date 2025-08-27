import React, { useState } from 'react';

const SIZE = 15;

const createEmptyBoard = () =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

const checkWinner = (board, row, col, player) => {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (const { dr, dc } of directions) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || board[r][c] !== player) break;
      count++;
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || board[r][c] !== player) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
};

const Gomoku = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [player, setPlayer] = useState('black');
  const [winner, setWinner] = useState(null);

  const handleClick = (r, c) => {
    if (board[r][c] || winner) return;
    const newBoard = board.map((row) => row.slice());
    newBoard[r][c] = player;
    setBoard(newBoard);
    if (checkWinner(newBoard, r, c, player)) {
      setWinner(player);
    } else {
      setPlayer(player === 'black' ? 'white' : 'black');
    }
  };

  const reset = () => {
    setBoard(createEmptyBoard());
    setPlayer('black');
    setWinner(null);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {winner && <div className="mb-4 capitalize">{`${winner} wins!`}</div>}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${SIZE}, 1.5rem)` }}>
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className="w-6 h-6 border border-gray-500 flex items-center justify-center cursor-pointer"
              onClick={() => handleClick(rIdx, cIdx)}
            >
              {cell && (
                <div
                  className={`w-4 h-4 rounded-full ${cell === 'black' ? 'bg-black' : 'bg-white'}`}
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
        Reset
      </button>
    </div>
  );
};

export default Gomoku;


export const displayGomoku = (addFolder, openApp) => <Gomoku addFolder={addFolder} openApp={openApp} />;
