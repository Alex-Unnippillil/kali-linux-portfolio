import React, { useEffect, useState } from 'react';
import useGameControls from '../../components/apps/useGameControls';
import { getBestMove } from '../../games/connect-four/solver';

const ROWS = 6;
const COLS = 7;
const CELL_SIZE = 40; // tailwind h-10 w-10
const GAP = 4; // gap-1 => 4px
const SLOT = CELL_SIZE + GAP;
const BOARD_HEIGHT = ROWS * SLOT - GAP;

type Cell = 'red' | 'yellow' | null;
type Board = Cell[][];

interface AnimatedDisc {
  col: number;
  row: number;
  color: Exclude<Cell, null>;
  y: number;
  vy: number;
  target: number;
}

type GameControls = [number | null, React.Dispatch<React.SetStateAction<number | null>>];
type Winner = Exclude<Cell, null> | 'draw' | null;

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
  const [winner, setWinner] = useState<Winner>(null);
  const [winningCells, setWinningCells] = useState<{ r: number; c: number }[]>([]);
  const [animDisc, setAnimDisc] = useState<AnimatedDisc | null>(null);
  const [hintColumn, setHintColumn] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [showMenu, setShowMenu] = useState(true);

  const aiDepth = { easy: 2, medium: 4, hard: 6 }[difficulty];

  const dropDisc = React.useCallback(
    (col: number, color: Exclude<Cell, null> = player) => {
      if (winner || animDisc) return;
      if (color !== player) return;
      const row = getValidRow(board, col);
      if (row === -1) return;
      setAnimDisc({ col, row, color, y: -SLOT, vy: 0, target: row * SLOT });
    },
    [winner, animDisc, player, board]
  );

  const useControls =
    useGameControls as unknown as (cols: number, onDrop: (col: number) => void) => GameControls;
  const [selectedCol, setSelectedCol] = useControls(COLS, dropDisc);


  const [winColumn, setWinColumn] = useState<number | null>(null);
  const [teaching, setTeaching] = useState<{ wins: { r: number; c: number }[][]; threats: { r: number; c: number }[][] }>({ wins: [], threats: [] });

  useEffect(() => {
    const opp = player === 'red' ? 'yellow' : 'red';
    setTeaching({ wins: getImmediateLines(board, player), threats: getImmediateLines(board, opp) });
  }, [board, player]);
  useEffect(() => {
    if (player === 'yellow' && !winner && !animDisc) {
      const { column } = getBestMove(board, aiDepth, 'yellow');
      setHintColumn(column);
    } else {
      setHintColumn(null);
    }
  }, [board, player, winner, animDisc, aiDepth]);

  const finalizeMove = React.useCallback(
    (newBoard: Board, color: Exclude<Cell, null>, col: number) => {
      const winCells = checkWinner(newBoard, color);
      if (winCells) {
        setWinner(color);
        setWinningCells(winCells);
        setWinColumn(col);
      } else if (isBoardFull(newBoard)) {
        setWinner('draw');
      } else {
        const next = color === 'red' ? 'yellow' : 'red';
        setPlayer(next);
      }
    },
    []
  );

  useEffect(() => {
    if (!animDisc) return;
    let raf: number;
    const animate = () => {
      setAnimDisc((d) => {
        if (!d) return d;
        let { y, vy, target } = d;
        vy += 1.5;
        y += vy;
        if (y >= target) {
          y = target;
          if (Math.abs(vy) < 1.5) {
            const newBoard = board.map((r: Cell[]) => [...r]);
            newBoard[d.row][d.col] = d.color;
            setBoard(newBoard);
            finalizeMove(newBoard, d.color, d.col);
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

  const aiMove = React.useCallback(() => {
    const { column } = getBestMove(board, aiDepth, 'red');
    if (column !== undefined) dropDisc(column, 'red');
  }, [board, dropDisc, aiDepth]);

  useEffect(() => {
    if (!showMenu && player === 'red' && !winner && !animDisc) {
      const timer = setTimeout(aiMove, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [player, winner, animDisc, board, aiMove, showMenu]);

  const startGame = () => {
    setBoard(createEmptyBoard());
    setWinner(null);
    setWinningCells([]);
    setPlayer('red');
    setWinColumn(null);
    setShowMenu(false);
  };

  const rematch = () => {
    setShowMenu(true);
  };

  const cellHighlight = (rIdx: number, cIdx: number) => {
    if (winningCells.some((p) => p.r === rIdx && p.c === cIdx)) return 'ring-4 ring-white';
    if (teaching.wins.some((line) => line.some((p) => p.r === rIdx && p.c === cIdx))) return 'ring-4 ring-green-400';
    if (teaching.threats.some((line) => line.some((p) => p.r === rIdx && p.c === cIdx))) return 'ring-4 ring-red-400';
    return '';
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {showMenu ? (
        <div className="flex flex-col items-center gap-4">
          <label className="flex flex-col items-center">
            <span className="mb-1">Difficulty</span>
            <select
              className="text-black"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={startGame}
          >
            Start
          </button>
        </div>
      ) : (
        <>
          {winner && (
            <div className="mb-2 capitalize">
              {winner === 'draw' ? 'Draw!' : `${winner} wins!`}
            </div>
          )}
          <div className="relative" onMouseLeave={() => setSelectedCol(null)}>
            <div className="grid grid-cols-7 gap-1">
              {board.map((row, rIdx) =>
                row.map((cell, cIdx) => (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`h-10 w-10 flex items-center justify-center cursor-pointer bg-blue-700 ${cellHighlight(
                      rIdx,
                      cIdx,
                    )}`}
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
            {selectedCol !== null && (
              <div
                className="absolute top-0 pointer-events-none bg-gradient-to-b from-black/30 to-transparent"
                style={{
                  left: selectedCol * SLOT,
                  width: CELL_SIZE,
                  height: BOARD_HEIGHT,
                }}
              />
            )}
            {hintColumn !== null && player === 'yellow' && (
              <div
                className="absolute"
                style={{ left: hintColumn * SLOT + CELL_SIZE / 2 - 4, top: -8 }}
              >
                <div className="h-2 w-2 rounded-full bg-yellow-300" />
              </div>
            )}
            {winColumn !== null && (
              <div
                className="absolute"
                style={{ left: winColumn * SLOT + CELL_SIZE / 2 - 4, top: -8 }}
              >
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
            )}
            {animDisc && (
              <div
                className="absolute left-0 top-0"
                style={{
                  transform: `translateX(${animDisc.col * SLOT}px) translateY(${animDisc.y}px)`,
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
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={rematch}
            >
              Rematch
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ConnectFour;

