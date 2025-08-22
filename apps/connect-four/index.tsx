import React, { useState, useEffect, useRef } from 'react';

const ROWS = 6;
const COLS = 7;

type Cell = 'R' | 'Y' | null;

type WinnerInfo = { winner: Cell; cells: [number, number][] } | null;

const createBoard = (): Cell[][] => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

const directions = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const checkWinner = (board: Cell[][]): WinnerInfo => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const player = board[r][c];
      if (!player) continue;
      for (const [dr, dc] of directions) {
        const cells: [number, number][] = [];
        for (let i = 0; i < 4; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
          if (board[rr][cc] !== player) break;
          cells.push([rr, cc]);
        }
        if (cells.length === 4) return { winner: player, cells };
      }
    }
  }
  return null;
};

const getValidColumns = (board: Cell[][]) =>
  Array.from({ length: COLS }, (_, c) => c).filter((c) => !board[0][c]);

const dropPiece = (board: Cell[][], col: number, player: Cell): number => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) {
      board[r][col] = player;
      return r;
    }
  }
  return -1;
};

const evaluateWindow = (window: Cell[], player: Cell) => {
  const opponent = player === 'R' ? 'Y' : 'R';
  const countPlayer = window.filter((c) => c === player).length;
  const countOpp = window.filter((c) => c === opponent).length;
  const countEmpty = window.filter((c) => c === null).length;
  let score = 0;
  if (countPlayer === 4) score += 100;
  else if (countPlayer === 3 && countEmpty === 1) score += 5;
  else if (countPlayer === 2 && countEmpty === 2) score += 2;
  if (countOpp === 3 && countEmpty === 1) score -= 4;
  return score;
};

const scorePosition = (board: Cell[][], player: Cell) => {
  let score = 0;
  // Center column preference
  const centerArray = board.map((row) => row[Math.floor(COLS / 2)]);
  const centerCount = centerArray.filter((c) => c === player).length;
  score += centerCount * 3;

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
      score += evaluateWindow(window, player);
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
      score += evaluateWindow(window, player);
    }
  }
  // Positive diagonal
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
      score += evaluateWindow(window, player);
    }
  }
  // Negative diagonal
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]];
      score += evaluateWindow(window, player);
    }
  }
  return score;
};

const isTerminal = (board: Cell[][]) =>
  checkWinner(board) !== null || getValidColumns(board).length === 0;

const minimax = (
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  player: Cell
): [number | null, number] => {
  const valid = getValidColumns(board);
  const terminal = isTerminal(board);
  if (depth === 0 || terminal) {
    if (terminal) {
      const win = checkWinner(board);
      if (win && win.winner === player) return [null, 1000000];
      if (win && win.winner !== player) return [null, -1000000];
      return [null, 0];
    }
    return [null, scorePosition(board, player)];
  }

  let bestCol = valid[Math.floor(Math.random() * valid.length)];
  if (maximizing) {
    let value = -Infinity;
    for (const col of valid) {
      const tempBoard = board.map((row) => row.slice());
      dropPiece(tempBoard, col, player);
      const [, newScore] = minimax(tempBoard, depth - 1, alpha, beta, false, player === 'R' ? 'Y' : 'R');
      if (newScore > value) {
        value = newScore;
        bestCol = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return [bestCol, value];
  }
  let value = Infinity;
  for (const col of valid) {
    const tempBoard = board.map((row) => row.slice());
    dropPiece(tempBoard, col, player);
    const [, newScore] = minimax(tempBoard, depth - 1, alpha, beta, true, player === 'R' ? 'Y' : 'R');
    if (newScore < value) {
      value = newScore;
      bestCol = col;
    }
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return [bestCol, value];
};

export default function ConnectFour() {
  const [board, setBoard] = useState<Cell[][]>(createBoard());
  const [current, setCurrent] = useState<Cell>('R');
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo>(null);
  const [ai, setAi] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [lastMove, setLastMove] = useState<{ r: number; c: number } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);

  const makeMove = (c: number, remote = false) => {
    if (winnerInfo || board[0][c]) return;
    const temp = board.map((row) => row.slice());
    const r = dropPiece(temp, c, current);
    setBoard(temp);
    setLastMove({ r, c });
    const win = checkWinner(temp);
    if (win) {
      setWinnerInfo(win);
    } else {
      setCurrent(current === 'R' ? 'Y' : 'R');
      if (!remote && wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'move', col: c }));
      }
    }
  };

  useEffect(() => {
    if (winnerInfo) {
      fetch('/api/connect-four', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: winnerInfo.winner, moves: board.flat().filter(Boolean).length }),
      });
    }
  }, [winnerInfo, board]);

  useEffect(() => {
    if (ai && current === 'Y' && !winnerInfo) {
      const depths = { easy: 2, medium: 4, hard: 6 };
      const [col] = minimax(board, depths[difficulty], -Infinity, Infinity, true, 'Y');
      if (col !== null) {
        const timer = setTimeout(() => makeMove(col, true), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [board, current, ai, winnerInfo, difficulty]);

  const connect = () => {
    fetch('/api/connect-four/socket');
    const ws = new WebSocket(`ws://${window.location.host}/api/connect-four/socket`);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', room }));
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'move') makeMove(data.col, true);
      if (data.type === 'reset') reset(true);
    };
    wsRef.current = ws;
    setAi(false);
    setJoined(true);
  };

  const reset = (remote = false) => {
    setBoard(createBoard());
    setCurrent('R');
    setWinnerInfo(null);
    setLastMove(null);
    if (!remote && wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'reset' }));
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {winnerInfo && <div className="mb-2 capitalize">{`${winnerInfo.winner === 'R' ? 'Red' : 'Yellow'} wins!`}</div>}
      <svg viewBox={`0 0 ${COLS * 100} ${ROWS * 100}`} className="w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
        <rect width={COLS * 100} height={ROWS * 100} fill="#0a3d62" rx={20} />
        {board.map((row, r) =>
          row.map((cell, c) => {
            const cx = c * 100 + 50;
            const cy = r * 100 + 50;
            const isLast = lastMove && lastMove.r === r && lastMove.c === c;
            const isWin = winnerInfo?.cells.some(([rr, cc]) => rr === r && cc === c);
            return (
              <g key={`${r}-${c}`} onClick={() => makeMove(c)} className="cursor-pointer">
                <circle cx={cx} cy={cy} r={45} fill="white" />
                {cell && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={40}
                    className={`${cell === 'R' ? 'fill-red-500' : 'fill-yellow-400'} ${isLast ? 'drop' : ''} ${isWin ? 'win' : ''}`}
                  />
                )}
              </g>
            );
          })
        )}
      </svg>
      <div className="mt-4 flex gap-2 items-center">
        {!joined && (
          <>
            <label className="mr-2">
              <input
                type="checkbox"
                checked={ai}
                onChange={(e) => setAi(e.target.checked)}
                className="mr-1"
              />
              Play vs AI
            </label>
            {ai && (
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="text-black p-1 rounded"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            )}
            {!ai && (
              <div className="flex items-center gap-1">
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Room"
                  className="p-1 rounded text-black"
                />
                <button onClick={connect} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                  Join
                </button>
              </div>
            )}
          </>
        )}
        <button onClick={() => reset()} className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded">
          Reset
        </button>
      </div>
      <style jsx global>{`
        .drop {
          animation: drop 0.3s ease-out;
        }
        @keyframes drop {
          from { transform: translateY(-700%); }
          to { transform: translateY(0); }
        }
        .win {
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

