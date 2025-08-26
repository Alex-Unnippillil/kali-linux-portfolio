import React, { useState, useEffect } from 'react';

const ROWS = 6;
const COLS = 7;
const CELL_SIZE = 40; // tailwind h-10 w-10
const GAP = 4; // gap-1 => 4px
const SLOT = CELL_SIZE + GAP;
const ANIM_MS = 300;

const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const useColumnControls = (cols, onDrop) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') {
        setSelected((s) => (s - 1 + cols) % cols);
      } else if (e.key === 'ArrowRight') {
        setSelected((s) => (s + 1) % cols);
      } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        onDrop(selected);
      } else {
        const num = parseInt(e.key, 10);
        if (!Number.isNaN(num) && num >= 1 && num <= cols) onDrop(num - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cols, selected, onDrop]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const start = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const end = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx > 0) setSelected((s) => (s + 1) % cols);
        else setSelected((s) => (s - 1 + cols) % cols);
      } else if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
        onDrop(selected);
      }
    };
    window.addEventListener('touchstart', start);
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchend', end);
    };
  }, [cols, selected, onDrop]);

  return [selected, setSelected];
};

const getValidRow = (board, col) => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) return r;
  }
  return -1;
};

const checkWinner = (board, player) => {
  const dirs = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const { dr, dc } of dirs) {
        const cells = [];
        for (let i = 0; i < 4; i++) {
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
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow(board[r].slice(c, c + 4), player);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      score += evaluateWindow(
        [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]],
        player
      );
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow(
        [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]],
        player
      );
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow(
        [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]],
        player
      );
    }
  }
  return score;
};

const getValidLocations = (board) => {
  const locations = [];
  for (let c = 0; c < COLS; c++) {
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
    if (checkWinner(board, 'yellow')) return { score: 1000000 };
    if (checkWinner(board, 'red')) return { score: -1000000 };
    return { score: scorePosition(board, 'yellow') };
  }
  if (maximizing) {
    let value = -Infinity;
    let column = validLocations[0];
    for (const col of validLocations) {
      const row = getValidRow(board, col);
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = 'yellow';
      const score = minimax(newBoard, depth - 1, alpha, beta, false).score;
      if (score > value) {
        value = score;
        column = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { column, score: value };
  } else {
    let value = Infinity;
    let column = validLocations[0];
    for (const col of validLocations) {
      const row = getValidRow(board, col);
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = 'red';
      const score = minimax(newBoard, depth - 1, alpha, beta, true).score;
      if (score < value) {
        value = score;
        column = col;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { column, score: value };
  }
};

const ConnectFour = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [player, setPlayer] = useState('red');
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [scores, setScores] = useState({ red: 0, yellow: 0 });
  const [depth, setDepth] = useState(4);
  const [animDisc, setAnimDisc] = useState(null);
  const [history, setHistory] = useState([]);
  const [best, setBest] = useState(0);
  const [selectedCol, setSelectedCol] = useColumnControls(COLS, (col) => dropDisc(col));

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('connect4Best') : null;
    if (stored) setBest(parseInt(stored, 10));
  }, []);

  const finalizeMove = (newBoard, color) => {
    const winCells = checkWinner(newBoard, color);
    if (winCells) {
      setWinner(color);
      setWinningCells(winCells);
      setScores((s) => {
        const updated = { ...s, [color]: s[color] + 1 };
        if (color === 'red' && updated.red > best) {
          setBest(updated.red);
          if (typeof window !== 'undefined') {
            localStorage.setItem('connect4Best', String(updated.red));
          }
        }
        return updated;
      });
    } else if (isBoardFull(newBoard)) {
      setWinner('draw');
    } else {
      setPlayer(color === 'red' ? 'yellow' : 'red');
      if (color === 'red') {
        setTimeout(aiMove, 300);
      }
    }
  };

  const dropDisc = (col, color = player) => {
    if (winner || animDisc) return;
    const row = getValidRow(board, col);
    if (row === -1) return;
    setHistory((h) => [
      ...h,
      {
        board: board.map((r) => [...r]),
        player,
        winner,
        winningCells,
        scores,
      },
    ]);
    setAnimDisc({ col, row, color, y: -1 });
    setTimeout(() => {
      setAnimDisc((d) => ({ ...d, y: row }));
    }, 20);
    setTimeout(() => {
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = color;
      setBoard(newBoard);
      setAnimDisc(null);
      finalizeMove(newBoard, color);
    }, ANIM_MS + 20);
  };

  const aiMove = () => {
    const { column } = minimax(board, depth, -Infinity, Infinity, true);
    if (column !== undefined) dropDisc(column, 'yellow');
  };

  const undo = () => {
    if (animDisc || history.length === 0) return;
    const newHist = [...history];
    let prev = newHist.pop();
    if (prev.player === 'yellow' && newHist.length) {
      prev = newHist.pop();
    }
    setBoard(prev.board);
    setPlayer(prev.player);
    setWinner(prev.winner);
    setWinningCells(prev.winningCells);
    setScores(prev.scores);
    setHistory(newHist);
  };

  const rematch = () => {
    setBoard(createEmptyBoard());
    setWinner(null);
    setWinningCells([]);
    setPlayer('red');
    setHistory([]);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2 flex gap-4 items-center">
        <div>Red: {scores.red}</div>
        <div>Yellow: {scores.yellow}</div>
        <div>Best: {best}</div>
        <div className="flex items-center">
          Depth:
          <input
            type="range"
            min="1"
            max="6"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value, 10))}
            className="ml-2"
          />
          <span className="ml-2">{depth}</span>
        </div>
      </div>
      {winner && (
        <div className="mb-2 capitalize">
          {winner === 'draw' ? 'Draw!' : `${winner} wins!`}
        </div>
      )}
      <div className="relative">
        <div className="grid grid-cols-7 gap-1">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isWin = winningCells.some((p) => p.r === rIdx && p.c === cIdx);
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`h-10 w-10 flex items-center justify-center cursor-pointer ${
                    cIdx === selectedCol ? 'bg-blue-600' : 'bg-blue-700'
                  }`}
                  onClick={() => dropDisc(cIdx)}
                  onMouseEnter={() => setSelectedCol(cIdx)}
                >
                  {cell && (
                    <div
                      className={`h-8 w-8 rounded-full ${
                        cell === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                      } ${isWin ? 'ring-4 ring-white' : ''}`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
        {animDisc && (
          <div
            className="absolute left-0 top-0 transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${animDisc.col * SLOT}px) translateY(${animDisc.y * SLOT}px)`,
            }}
          >
            <div
              className={`h-8 w-8 rounded-full ${
                animDisc.color === 'red' ? 'bg-red-500' : 'bg-yellow-400'
              }`}
            />
          </div>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={undo}
        >
          Undo
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={rematch}
        >
          Rematch
        </button>
      </div>
    </div>
  );
};

export default ConnectFour;

