import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameLayout from './GameLayout';
import { checkWinner, minimax, createBoard } from '../../apps/games/tictactoe/logic';

const SKINS = {
  classic: { X: 'X', O: 'O' },
  emoji: { X: '❌', O: '⭕' },
  animals: { X: '🐱', O: '🐶' },
  fruits: { X: '🍎', O: '🍌' },
};

const TicTacToe = () => {
  const [size, setSize] = useState(3);
  const [mode, setMode] = useState('classic');
  const [skin, setSkin] = useState('classic');
  const [level, setLevel] = useState('hard');
  const [board, setBoard] = useState(createBoard(3));
  const [player, setPlayer] = useState(null);
  const [ai, setAi] = useState(null);
  const [status, setStatus] = useState('Choose X or O');
  const [winLine, setWinLine] = useState(null);
  const [stats, setStats] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('tictactoeStats') || '{}');
    } catch {
      return {};
    }
  });

  const lineRef = useRef(null);

  const variantKey = `${mode}-${size}`;
  const recordResult = useCallback(
    (res) => {
      setStats((prev) => {
        const cur = prev[variantKey] || { wins: 0, losses: 0, draws: 0 };
        const updated = {
          ...prev,
          [variantKey]: {
            wins: res === 'win' ? cur.wins + 1 : cur.wins,
            losses: res === 'loss' ? cur.losses + 1 : cur.losses,
            draws: res === 'draw' ? cur.draws + 1 : cur.draws,
          },
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('tictactoeStats', JSON.stringify(updated));
        }
        return updated;
      });
    },
    [variantKey]
  );

  useEffect(() => {
    setBoard(createBoard(size));
    setPlayer(null);
    setAi(null);
    setStatus('Choose X or O');
    setWinLine(null);
  }, [size, mode]);

  const startGame = (p) => {
    const a = p === 'X' ? 'O' : 'X';
    setPlayer(p);
    setAi(a);
    setBoard(createBoard(size));
    setStatus(`${SKINS[skin][p]}'s turn`);
    setWinLine(null);
  };

  const handleClick = (idx) => {
    if (player === null) return;
    if (board[idx] || checkWinner(board, size, mode === 'misere').winner) return;
    const newBoard = board.slice();
    newBoard[idx] = player;
    setBoard(newBoard);
  };

  useEffect(() => {
    if (player === null || ai === null) return;
    const { winner, line } = checkWinner(board, size, mode === 'misere');
    if (winner) {
      setStatus(winner === 'draw' ? 'Draw' : `${SKINS[skin][winner]} wins`);
      setWinLine(line);
      if (winner === 'draw') recordResult('draw');
      else if (winner === player) recordResult('win');
      else recordResult('loss');
      return;
    }
    const filled = board.filter(Boolean).length;
    const isPlayerTurn =
      (player === 'X' && filled % 2 === 0) || (player === 'O' && filled % 2 === 1);
    if (!isPlayerTurn) {
      const getRandomMove = (b) => {
        const options = b
          .map((c, i) => (c ? null : i))
          .filter((v) => v !== null);
        return options[Math.floor(Math.random() * options.length)] ?? -1;
      };
      let move = -1;
      if (level === 'easy') {
        move = getRandomMove(board.slice());
      } else if (level === 'medium') {
        move = Math.random() < 0.5
          ? getRandomMove(board.slice())
          : minimax(board.slice(), ai, size, mode === 'misere').index;
      } else {
        move = minimax(board.slice(), ai, size, mode === 'misere').index;
      }
      if (move >= 0) {
        const newBoard = board.slice();
        newBoard[move] = ai;
        setTimeout(() => setBoard(newBoard), 200);
      }
    } else {
      setStatus(`${SKINS[skin][player]}'s turn`);
    }
  }, [board, player, ai, size, skin, mode, level, recordResult]);

  useEffect(() => {
    if (winLine && lineRef.current) {
      const line = lineRef.current;
      const length = line.getTotalLength();
      line.style.transition = 'none';
      line.style.strokeDasharray = String(length);
      line.style.strokeDashoffset = String(length);
      requestAnimationFrame(() => {
        line.style.transition = 'stroke-dashoffset 0.5s ease';
        line.style.strokeDashoffset = '0';
      });
    }
  }, [winLine]);

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
          </select>
        </div>
        <div className="mb-4">Mode:
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            <option value="classic">Classic</option>
            <option value="misere">Misère (three-in-a-row loses)</option>
          </select>
        </div>
        <div className="mb-4">AI Level:
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
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
            className="px-4 py-2 bg-gray-700 interactive-surface rounded"
            onClick={() => startGame('X')}
          >
            {currentSkin.X}
          </button>
          <button
            className="px-4 py-2 bg-gray-700 interactive-surface rounded"
            onClick={() => startGame('O')}
          >
            {currentSkin.O}
          </button>
        </div>
        <div className="mt-4 text-sm">
          <div>Stats for {mode} {size}×{size}:</div>
          <div>
            Wins: {stats[variantKey]?.wins || 0} | Losses: {stats[variantKey]?.losses || 0} | Draws: {stats[variantKey]?.draws || 0}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2" aria-live="polite">
        {status}
      </div>
      <div className="relative" style={{ width: `${size * 4.5}rem`, height: `${size * 4.5}rem` }}>
        <div
          className="absolute inset-0 grid gap-px bg-gray-500"
          style={{ gridTemplateColumns: `repeat(${size},1fr)` }}
        >
          {board.map((cell, idx) => (
            <button
              key={idx}
              className="w-full h-full flex items-center justify-center bg-gray-700 text-5xl"
              onClick={() => handleClick(idx)}
            >
              {cell ? currentSkin[cell] : ''}
            </button>
          ))}
        </div>
        {winLine && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${size * 100} ${size * 100}`}
          >
            {(() => {
              const start = winLine[0];
              const end = winLine[winLine.length - 1];
              const sx = (start % size) * 100 + 50;
              const sy = Math.floor(start / size) * 100 + 50;
              const ex = (end % size) * 100 + 50;
              const ey = Math.floor(end / size) * 100 + 50;
              return (
                <line
                  ref={lineRef}
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  stroke="red"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>
        )}
      </div>
      <div className="flex space-x-4 mt-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded interactive-surface"
          onClick={() => {
            setBoard(createBoard(size));
            setStatus(`${currentSkin[player]}'s turn`);
            setWinLine(null);
          }}
        >
          Restart
        </button>
        <button
          className="px-4 py-2 bg-gray-700 interactive-surface rounded"
          onClick={() => {
            setPlayer(null);
            setAi(null);
            setBoard(createBoard(size));
            setStatus('Choose X or O');
            setWinLine(null);
          }}
        >
          Reset
        </button>
      </div>
      <div className="mt-4 text-sm">
        <div>Stats for {mode} {size}×{size}:</div>
        <div>
          Wins: {stats[variantKey]?.wins || 0} | Losses: {stats[variantKey]?.losses || 0} | Draws: {stats[variantKey]?.draws || 0}
        </div>
      </div>
    </div>
  );
};

export { checkWinner, minimax } from '../../apps/games/tictactoe/logic';

export default function TicTacToeApp() {
  return (
    <GameLayout gameId="tictactoe">
      <TicTacToe />
    </GameLayout>
  );
}
