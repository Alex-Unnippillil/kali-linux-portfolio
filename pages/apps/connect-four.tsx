import React, { useEffect, useState } from 'react';
import useGameControls from '../../components/apps/useGameControls';

const ROWS = 6;
const COLS = 7;
const CELL_SIZE = 40; // tailwind h-10 w-10
const GAP = 4; // gap-1 => 4px
const SLOT = CELL_SIZE + GAP;
const ANIM_MS = 300;

type Cell = 'red' | 'yellow' | null;
type Board = Cell[][];

const createEmptyBoard = (): Board => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

const getValidRow = (board: Board, col: number) => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) return r;
  }
  return -1;
};

const checkWinner = (board: Board, player: Exclude<Cell, null>) => {
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
        const cells: { r: number; c: number }[] = [];
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

const isBoardFull = (board: Board) => board[0].every(Boolean);

const evaluateWindow = (window: Cell[], player: Exclude<Cell, null>) => {
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

const scorePosition = (board: Board, player: Exclude<Cell, null>) => {
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

const getValidLocations = (board: Board) => {
  const locations: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (!board[0][c]) locations.push(c);
  }
  return locations;
};

const minimax = (board: Board, depth: number, alpha: number, beta: number, maximizing: boolean) => {
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
  } else {
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
  }
};

const getImmediateLines = (board: Board, player: Exclude<Cell, null>) => {
  const dirs = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];
  const lines: { r: number; c: number }[][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const { dr, dc } of dirs) {
        const cells: { r: number; c: number; v: Cell }[] = [];
        for (let i = 0; i < 4; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) {
            cells.length = 0;
            break;
          }
          cells.push({ r: rr, c: cc, v: board[rr][cc] });
        }
        if (cells.length === 4) {
          const playerCount = cells.filter((p) => p.v === player).length;
          const emptyCells = cells.filter((p) => p.v === null);
          if (playerCount === 3 && emptyCells.length === 1) {
            const empty = emptyCells[0];
            if (getValidRow(board, empty.c) === empty.r) {
              lines.push(cells.map(({ r, c }) => ({ r, c })));
            }
          }
        }
      }
    }
  }
  return lines;
};

const ConnectFour = () => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [player, setPlayer] = useState<'red' | 'yellow'>('red');
  const [winner, setWinner] = useState<Cell>(null);
  const [winningCells, setWinningCells] = useState<{ r: number; c: number }[]>([]);
  const [animDisc, setAnimDisc] = useState<any>(null);
  const [selectedCol, setSelectedCol] = useGameControls(COLS, (col) => dropDisc(col));
  const [teaching, setTeaching] = useState<{ wins: { r: number; c: number }[][]; threats: { r: number; c: number }[][] }>({ wins: [], threats: [] });

  useEffect(() => {
    const opp = player === 'red' ? 'yellow' : 'red';
    setTeaching({ wins: getImmediateLines(board, player), threats: getImmediateLines(board, opp) });
  }, [board, player]);

  const finalizeMove = (newBoard: Board, color: Exclude<Cell, null>) => {
    const winCells = checkWinner(newBoard, color);
    if (winCells) {
      setWinner(color);
      setWinningCells(winCells);
    } else if (isBoardFull(newBoard)) {
      setWinner('draw' as any);
    } else {
      const next = color === 'red' ? 'yellow' : 'red';
      setPlayer(next);
    }
  };

  const dropDisc = React.useCallback(
    (col: number, color: Exclude<Cell, null> = player) => {
      if (winner || animDisc) return;
      if (color !== player) return;
      const row = getValidRow(board, col);
      if (row === -1) return;
      setAnimDisc({ col, row, color, y: -1 });
      setTimeout(() => {
        setAnimDisc((d: any) => ({ ...d, y: row }));
      }, 20);
      setTimeout(() => {
        const newBoard = board.map((r) => [...r]);
        newBoard[row][col] = color;
        setBoard(newBoard);
        setAnimDisc(null);
        finalizeMove(newBoard, color);
      }, ANIM_MS + 20);
    },
    [winner, animDisc, player, board]
  );

  const aiMove = React.useCallback(() => {
    const { column } = minimax(board, 6, -Infinity, Infinity, true);
    if (column !== undefined) dropDisc(column, 'red');
  }, [board, dropDisc]);

  useEffect(() => {
    if (player === 'red' && !winner && !animDisc) {
      const timer = setTimeout(aiMove, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [player, winner, animDisc, board, aiMove]);

  const rematch = () => {
    setBoard(createEmptyBoard());
    setWinner(null);
    setWinningCells([]);
    setPlayer('red');
  };

  const cellHighlight = (rIdx: number, cIdx: number) => {
    if (winningCells.some((p) => p.r === rIdx && p.c === cIdx)) return 'ring-4 ring-white';
    if (teaching.wins.some((line) => line.some((p) => p.r === rIdx && p.c === cIdx))) return 'ring-4 ring-green-400';
    if (teaching.threats.some((line) => line.some((p) => p.r === rIdx && p.c === cIdx))) return 'ring-4 ring-red-400';
    return '';
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {winner && (
        <div className="mb-2 capitalize">
          {winner === 'draw' ? 'Draw!' : `${winner} wins!`}
        </div>
      )}
      <div className="relative">
        <div className="grid grid-cols-7 gap-1">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`h-10 w-10 flex items-center justify-center cursor-pointer ${
                  cIdx === selectedCol ? 'bg-blue-600' : 'bg-blue-700'
                } ${cellHighlight(rIdx, cIdx)}`}
                onClick={() => dropDisc(cIdx, 'yellow')}
                onMouseEnter={() => setSelectedCol(cIdx)}
              >
                {cell && (
                  <div
                    className={`h-8 w-8 rounded-full ${
                      cell === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                    }`}
                  />
                )}
              </div>
            ))
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
      <button
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={rematch}
      >
        Rematch
      </button>
    </div>
  );
};

export default ConnectFour;

