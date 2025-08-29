import React, { useState, useEffect } from 'react';
import GameLayout from './GameLayout';
import { checkWinner, minimax, createBoard } from '../../apps/games/tictactoe/engine';

const SKINS = {
  classic: { X: 'X', O: 'O' },
  emoji: { X: '❌', O: '⭕' },
  animals: { X: '🐱', O: '🐶' },
  fruits: { X: '🍎', O: '🍌' },
};

const TicTacToe = () => {
  const [size, setSize] = useState(3);
  const [skin, setSkin] = useState('classic');
  const [board, setBoard] = useState(createBoard(3));
  const [player, setPlayer] = useState(null);
  const [ai, setAi] = useState(null);
  const [status, setStatus] = useState('Choose X or O');

  useEffect(() => {
    setBoard(createBoard(size));
    setPlayer(null);
    setAi(null);
    setStatus('Choose X or O');
  }, [size]);

  const startGame = (p) => {
    const a = p === 'X' ? 'O' : 'X';
    setPlayer(p);
    setAi(a);
    setBoard(createBoard(size));
    setStatus(`${SKINS[skin][p]}'s turn`);
  };

  const handleClick = (idx) => {
    if (player === null) return;
    if (board[idx] || checkWinner(board, size).winner) return;
    const newBoard = board.slice();
    newBoard[idx] = player;
    setBoard(newBoard);
  };

  useEffect(() => {
    if (player === null || ai === null) return;
    const result = checkWinner(board, size);
    if (result.winner) {
      setStatus(result.winner === 'draw' ? 'Draw' : `${SKINS[skin][result.winner]} wins`);
      return;
    }
    const filled = board.filter(Boolean).length;
    const isPlayerTurn =
      (player === 'X' && filled % 2 === 0) || (player === 'O' && filled % 2 === 1);
    if (!isPlayerTurn) {
      const move = minimax(board.slice(), ai, size).index;
      if (move >= 0) {
        const newBoard = board.slice();
        newBoard[move] = ai;
        setTimeout(() => setBoard(newBoard), 200);
      }
    } else {
      setStatus(`${SKINS[skin][player]}'s turn`);
    }
  }, [board, player, ai, size, skin]);

  const currentSkin = SKINS[skin];

  if (player === null) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        <div className="mb-4">Size:
          <select
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            <option value={3}>3×3</option>
            <option value={4}>4×4</option>
            <option value={5}>5×5</option>
          </select>
        </div>
        <div className="mb-4">Skin:
          <select
            value={skin}
            onChange={(e) => setSkin(e.target.value)}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            {Object.keys(SKINS).map((k) => (
              <option key={k} value={k}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">Choose X or O</div>
        <div className="flex space-x-4">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('X')}
          >
            {currentSkin.X}
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('O')}
          >
            {currentSkin.O}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2" aria-live="polite">
        {status}
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size},4rem)` }}
      >
        {board.map((cell, idx) => (
          <button
            key={idx}
            className="w-16 h-16 m-1 flex items-center justify-center bg-gray-700 text-2xl"
            onClick={() => handleClick(idx)}
          >
            {cell ? currentSkin[cell] : ''}
          </button>
        ))}
      </div>
      <div className="flex space-x-4 mt-4">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            setBoard(createBoard(size));
            setStatus(`${currentSkin[player]}'s turn`);
          }}
        >
          Restart
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            setPlayer(null);
            setAi(null);
            setBoard(createBoard(size));
            setStatus('Choose X or O');
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export { checkWinner, minimax } from '../../apps/games/tictactoe/engine';

export default function TicTacToeApp() {
  return (
    <GameLayout gameId="tictactoe">
      <TicTacToe />
    </GameLayout>
  );
}
