import React, { useEffect, useState, useCallback } from 'react';
import GameLayout from './GameLayout';
import {
  ROWS,
  COLS,
  createEmptyBoard,
  getValidRow,
  checkWinner,
  isBoardFull,
  getBestMove,
} from '../../games/connect-four/solver';

const CELL_SIZE = 40; // tailwind h-10 w-10
const GAP = 4; // gap-1 => 4px
const SLOT = CELL_SIZE + GAP;
const BOARD_HEIGHT = ROWS * SLOT - GAP;

const COLORS = {
  red: 'bg-blue-500',
  yellow: 'bg-orange-400',
};
const COLOR_NAMES = {
  red: 'Blue',
  yellow: 'Orange',
};

export default function ConnectFour() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [player, setPlayer] = useState('yellow');
  const [winner, setWinner] = useState(null);
  const [game, setGame] = useState({ history: [] });
  const [hoverCol, setHoverCol] = useState(null);
  const [animDisc, setAnimDisc] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [difficulty, setDifficulty] = useState(4);

  const finalizeMove = useCallback((newBoard, color) => {
    const winCells = checkWinner(newBoard, color);
    if (winCells) {
      setWinner(color);
      setWinningCells(winCells);
    } else if (isBoardFull(newBoard)) {
      setWinner('draw');
    } else {
      setPlayer(color === 'red' ? 'yellow' : 'red');
    }
  }, []);

  const dropDisc = useCallback(
    (col, color) => {
      if (winner || animDisc) return;
      const row = getValidRow(board, col);
      if (row === -1) return;
      setAnimDisc({ col, row, color, y: -SLOT, vy: 0, target: row * SLOT });
    },
    [winner, animDisc, board],
  );

  const handleClick = (col) => {
    if (player !== 'yellow' || winner || animDisc) return;
    setGame((g) => ({ history: [...g.history, board.map((r) => [...r])] }));
    dropDisc(col, 'yellow');
  };

  const undo = () => {
    setGame((g) => {
      if (!g.history.length || animDisc) return g;
      const prev = g.history[g.history.length - 1];
      setBoard(prev);
      setPlayer('yellow');
      setWinner(null);
      setWinningCells([]);
      return { history: g.history.slice(0, -1) };
    });
  };

  useEffect(() => {
    if (!animDisc) return;
    let raf;
    const animate = () => {
      setAnimDisc((d) => {
        if (!d) return d;
        let { y, vy, target } = d;
        vy += 1.5;
        y += vy;
        if (y >= target) {
          y = target;
          if (Math.abs(vy) < 1.5) {
            const newBoard = board.map((r) => [...r]);
            newBoard[d.row][d.col] = d.color;
            setBoard(newBoard);
            finalizeMove(newBoard, d.color);
            return null;
          }
          vy = -vy * 0.5;
        }
        return { ...d, y, vy };
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [animDisc, board, finalizeMove]);

  useEffect(() => {
    if (player === 'red' && !winner && !animDisc) {
      const { column } = getBestMove(board, difficulty, 'red');
      if (column !== undefined) dropDisc(column, 'red');
    }
  }, [player, winner, board, animDisc, dropDisc, difficulty]);

  const reset = () => {
    setBoard(createEmptyBoard());
    setPlayer('yellow');
    setWinner(null);
    setGame({ history: [] });
    setWinningCells([]);
    setHoverCol(null);
  };

  const boardWidth = COLS * SLOT - GAP;

  return (
    <GameLayout gameId="connect-four">
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 relative">
        {winner && (
          <div className="mb-2 capitalize">
            {winner === 'draw' ? 'Draw!' : `${COLOR_NAMES[winner]} wins!`}
          </div>
        )}
        <button
          className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Restart
        </button>
        <div className="mb-2">
          AI Depth:
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            {Array.from({ length: 7 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div
          className="relative"
          style={{ width: boardWidth, height: BOARD_HEIGHT }}
          onMouseLeave={() => setHoverCol(null)}
        >
          <div className="grid grid-cols-7 gap-1">
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <button
                  key={`${rIdx}-${cIdx}`}
                  aria-label={`cell-${rIdx}-${cIdx}`}
                  className={`w-10 h-10 rounded-full flex items-center justify-center focus:outline-none ${
                    hoverCol === cIdx && !winner ? 'bg-gray-600' : 'bg-gray-700'
                  }`}
                  onClick={() => handleClick(cIdx)}
                  onMouseEnter={() => setHoverCol(cIdx)}
                >
                  {cell && (
                    <div
                      className={`w-8 h-8 rounded-full ${COLORS[cell]}`}
                    />
                  )}
                </button>
              )),
            )}
          </div>
          {winningCells.length === 4 && (
            <svg
              viewBox={`0 0 ${COLS} ${ROWS}`}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            >
              <line
                x1={winningCells[0].c + 0.5}
                y1={winningCells[0].r + 0.5}
                x2={winningCells[3].c + 0.5}
                y2={winningCells[3].r + 0.5}
                stroke="white"
                strokeWidth="0.2"
                strokeLinecap="round"
              />
            </svg>
          )}
          {animDisc && (
            <div
              className="absolute"
              style={{
                transform: `translateX(${animDisc.col * SLOT}px) translateY(${animDisc.y}px)`,
              }}
            >
              <div
                className={`w-8 h-8 rounded-full ${COLORS[animDisc.color]}`}
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={undo}
            disabled={game.history.length === 0 || animDisc}
          >
            Undo
          </button>
        </div>
      </div>
    </GameLayout>
  );
}

