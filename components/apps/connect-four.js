import React, { useEffect, useState, useCallback } from 'react';
import GameLayout from './GameLayout';
import { evaluateColumns } from '../../games/connect-four/solver';

const ROWS = 6;
const COLS = 7;
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

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const getValidRow = (board, col) => {
  for (let r = ROWS - 1; r >= 0; r -= 1) {
    if (!board[r][col]) return r;
  }
  return -1;
};

const checkWinner = (board, player) => {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of dirs) {
        const cells = [];
        for (let i = 0; i < 4; i += 1) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
          if (board[rr][cc] !== player) break;
          cells.push({ r: rr, c: cc });
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return null;
};

const isBoardFull = (board) => board[0].every(Boolean);

const evaluateWindow = (window, player) => {
  const opp = player === 'red' ? 'yellow' : 'red';
  let score = 0;
  const playerCount = window.filter((v) => v === player).length;
  const oppCount = window.filter((v) => v === opp).length;
  const empty = window.filter((v) => v === null).length;
  if (playerCount === 4) score += 100;
  else if (playerCount === 3 && empty === 1) score += 5;
  else if (playerCount === 2 && empty === 2) score += 2;
  if (oppCount === 3 && empty === 1) score -= 4;
  return score;
};

const scorePosition = (board, player) => {
  let score = 0;
  const center = Math.floor(COLS / 2);
  const centerArray = board.map((row) => row[center]);
  score += centerArray.filter((v) => v === player).length * 3;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(board[r].slice(c, c + 4), player);
    }
  }
  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS - 3; r += 1) {
      score += evaluateWindow(
        [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]],
        player,
      );
    }
  }
  for (let r = 0; r < ROWS - 3; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(
        [
          board[r][c],
          board[r + 1][c + 1],
          board[r + 2][c + 2],
          board[r + 3][c + 3],
        ],
        player,
      );
    }
  }
  for (let r = 3; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      score += evaluateWindow(
        [
          board[r][c],
          board[r - 1][c + 1],
          board[r - 2][c + 2],
          board[r - 3][c + 3],
        ],
        player,
      );
    }
  }
  return score;
};

const getValidLocations = (board) => {
  const locations = [];
  for (let c = 0; c < COLS; c += 1) {
    if (!board[0][c]) locations.push(c);
  }
  return locations;
};

const minimax = (board, depth, alpha, beta, maximizing) => {
  const validLocations = getValidLocations(board);
  const isTerminal =
    checkWinner(board, 'red') ||
    checkWinner(board, 'yellow') ||
    validLocations.length === 0;
  if (depth === 0 || isTerminal) {
    if (checkWinner(board, 'red')) return { score: 1000000 };
    if (checkWinner(board, 'yellow')) return { score: -1000000 };
    return { score: scorePosition(board, 'red') };
  }
  if (maximizing) {
    let value = -Infinity;
    let column = validLocations[0];
    for (const col of validLocations) {
      const row = getValidRow(board, col);
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = 'red';
      const score = minimax(newBoard, depth - 1, alpha, beta, false).score;
      if (score > value) {
        value = score;
        column = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { column, score: value };
  }
  let value = Infinity;
  let column = validLocations[0];
  for (const col of validLocations) {
    const row = getValidRow(board, col);
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = 'yellow';
    const score = minimax(newBoard, depth - 1, alpha, beta, true).score;
    if (score < value) {
      value = score;
      column = col;
    }
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return { column, score: value };
};

export default function ConnectFour() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [player, setPlayer] = useState('yellow');
  const [winner, setWinner] = useState(null);
  const [game, setGame] = useState({ history: [] });
  const [hoverCol, setHoverCol] = useState(null);
  const [animDisc, setAnimDisc] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [scores, setScores] = useState(Array(COLS).fill(null));

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
    setScores(evaluateColumns(board, player));
  }, [board, player]);

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
      const { column } = minimax(board, 4, -Infinity, Infinity, true);
      if (column !== undefined) dropDisc(column, 'red');
    }
  }, [player, winner, board, animDisc, dropDisc]);

  const reset = () => {
    setBoard(createEmptyBoard());
    setPlayer('yellow');
    setWinner(null);
    setGame({ history: [] });
    setWinningCells([]);
    setHoverCol(null);
  };

  const validScores = scores.filter((s) => s !== null);
  const minScore = validScores.length ? Math.min(...validScores) : 0;
  const maxScore = validScores.length ? Math.max(...validScores) : 0;
  const getColor = useCallback(
    (s) => {
      if (s == null || maxScore === minScore) return undefined;
      const t = (s - minScore) / (maxScore - minScore);
      const r = Math.round(255 * (1 - t));
      const g = Math.round(255 * t);
      return `rgba(${r}, ${g}, 0, 0.5)`;
    },
    [minScore, maxScore],
  );

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
          className="absolute top-2 right-2 px-3 py-1 bg-gray-700 interactive-surface rounded"
          onClick={reset}
        >
          Restart
        </button>
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
                  className="w-10 h-10 rounded-full flex items-center justify-center focus:outline-none bg-gray-700"
                  style={
                    hoverCol === cIdx && !winner
                      ? { backgroundColor: getColor(scores[cIdx]) }
                      : undefined
                  }
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
            className="px-4 py-2 bg-gray-700 interactive-surface rounded"
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

