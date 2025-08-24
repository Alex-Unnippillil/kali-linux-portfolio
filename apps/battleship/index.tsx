import React, { useState, useEffect } from 'react';
import BattleshipAI, { CellState } from './ai';
import generatePuzzle, { Cell, countSolutions } from './puzzle';

// Utility to create empty board
const createBoard = (size: number, fill: CellState = 0): CellState[][] =>
  Array.from({ length: size }, () => Array(size).fill(fill));

// Random fleet placement for classic mode
const FLEET = [5, 4, 3, 3, 2];
const dirs: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const placeFleet = (size: number): CellState[][] => {
  const board = createBoard(size, 0);
  const canPlace = (r: number, c: number, len: number, vertical: boolean): boolean => {
    for (let k = 0; k < len; k++) {
      const nr = r + (vertical ? k : 0);
      const nc = c + (vertical ? 0 : k);
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) return false;
      if (board[nr][nc] !== 0) return false;
      for (const [dr, dc] of dirs) {
        const ar = nr + dr;
        const ac = nc + dc;
        if (ar >= 0 && ac >= 0 && ar < size && ac < size) {
          if (board[ar][ac] === 1) return false;
        }
      }
    }
    return true;
  };
  const place = (r: number, c: number, len: number, vertical: boolean, val: CellState) => {
    for (let k = 0; k < len; k++) {
      const nr = r + (vertical ? k : 0);
      const nc = c + (vertical ? 0 : k);
      board[nr][nc] = val;
    }
  };
  for (const len of FLEET) {
    let placed = false;
    while (!placed) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      const vertical = Math.random() < 0.5;
      if (canPlace(r, c, len, vertical)) {
        place(r, c, len, vertical, 1);
        placed = true;
      }
    }
  }
  return board;
};

const Battleship: React.FC = () => {
  const [mode, setMode] = useState<'classic' | 'puzzle'>('classic');
  // classic mode state
  const size = 10;
  const [playerBoard, setPlayerBoard] = useState<CellState[][]>(() => placeFleet(size));
  const [aiBoard, setAiBoard] = useState<CellState[][]>(() => placeFleet(size));
  const [aiKnowledge, setAiKnowledge] = useState<CellState[][]>(() => createBoard(size));
  const [message, setMessage] = useState('Your turn');
  const [difficulty, setDifficulty] = useState(1); // 0 easy,1 normal,2 hard
  const ai = new BattleshipAI(size);

  const shoot = (board: CellState[][], r: number, c: number): CellState[][] => {
    const clone = board.map((row) => row.slice());
    clone[r][c] = clone[r][c] === 1 ? 2 : 1; // 1=ship,2=hit
    return clone;
  };

  const playerShot = (r: number, c: number) => {
    if (mode !== 'classic') return;
    if (aiBoard[r][c] === 2 || aiBoard[r][c] === 3) return;
    if (aiBoard[r][c] === 1) {
      setAiBoard((b) => shoot(b, r, c));
      setMessage(`Hit at ${String.fromCharCode(65 + c)}-${r + 1}`);
    } else {
      setAiBoard((b) => {
        const clone = b.map((row) => row.slice());
        clone[r][c] = 3; // miss marker
        return clone;
      });
      setMessage(`Miss at ${String.fromCharCode(65 + c)}-${r + 1}`);
      aiTurn();
    }
  };

  const aiTurn = () => {
    const shot = ai.nextShot(aiKnowledge, difficulty);
    setAiKnowledge((k) => {
      const clone = k.map((row) => row.slice());
      const hit = playerBoard[shot.row][shot.col] === 1;
      clone[shot.row][shot.col] = hit ? 2 : 1;
      setPlayerBoard((b) => {
        const nb = b.map((row) => row.slice());
        if (hit) nb[shot.row][shot.col] = 2;
        else nb[shot.row][shot.col] = 3;
        return nb;
      });
      setMessage(`${hit ? 'AI hit' : 'AI miss'} at ${String.fromCharCode(65 + shot.col)}-${
        shot.row + 1
      }`);
      return clone;
    });
  };

  // puzzle mode state
  const [puzzle, setPuzzle] = useState<ReturnType<typeof generatePuzzle> | null>(null);
  const [userPuzzle, setUserPuzzle] = useState<Cell[][]>([]);

  useEffect(() => {
    if (mode === 'puzzle') {
      const p = generatePuzzle();
      setPuzzle(p);
      setUserPuzzle(p.puzzle.map((r) => r.slice()));
    }
  }, [mode]);

  const toggleCell = (r: number, c: number) => {
    if (!userPuzzle.length) return;
    setUserPuzzle((p) => {
      const clone = p.map((row) => row.slice());
      const val = clone[r][c];
      clone[r][c] = val === 'unknown' ? 'ship' : val === 'ship' ? 'water' : 'unknown';
      return clone;
    });
  };

  const checkPuzzle = () => {
    if (!puzzle) return;
    const solution = countSolutions(
      userPuzzle.map((r) => r.slice()),
      puzzle.rowCounts.slice(),
      puzzle.colCounts.slice(),
    );
    setMessage(solution === 1 ? 'Puzzle solved!' : 'Not solved');
  };

  const boardView = (board: CellState[][], click: (r: number, c: number) => void) => (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${board.length}, 1fr)` }}>
      {board.map((row, r) =>
        row.map((cell, c) => {
          let label = `${String.fromCharCode(65 + c)}-${r + 1}`;
          let className = 'w-8 h-8 flex items-center justify-center border';
          if (cell === 2) {
            className += ' bg-red-500';
            label += ', hit';
          } else if (cell === 3) {
            className += ' bg-gray-300';
            label += ', miss';
          }
          return (
            <button
              key={`${r}-${c}`}
              aria-label={label}
              className={className}
              onClick={() => click(r, c)}
            />
          );
        }),
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Battleship</h1>
      <div>
        <label>
          Mode:
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="ml-2">
            <option value="classic">Classic PvE</option>
            <option value="puzzle">Yubotu Puzzle</option>
          </select>
        </label>
        {mode === 'classic' && (
          <label className="ml-4">
            Difficulty:
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="ml-2"
            >
              <option value={0}>Easy</option>
              <option value={1}>Normal</option>
              <option value={2}>Hard</option>
            </select>
          </label>
        )}
      </div>
      <div className="text-sm" aria-live="polite">
        {message}
      </div>
      {mode === 'classic' && (
        <div className="flex space-x-4">
          <div>
            <h2>Your Board</h2>
            {boardView(playerBoard, () => {})}
          </div>
          <div>
            <h2>Enemy Board</h2>
            {boardView(aiBoard, playerShot)}
          </div>
        </div>
      )}
      {mode === 'puzzle' && puzzle && (
        <div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${puzzle.puzzle.length}, 1fr)` }}>
            {userPuzzle.map((row, r) =>
              row.map((cell, c) => {
                let className = 'w-8 h-8 flex items-center justify-center border';
                let label = `${String.fromCharCode(65 + c)}-${r + 1}`;
                if (cell === 'ship') {
                  className += ' bg-blue-500';
                  label += ', ship';
                } else if (cell === 'water') {
                  className += ' bg-gray-200';
                  label += ', water';
                }
                return (
                  <button
                    key={`${r}-${c}`}
                    aria-label={label}
                    className={className}
                    onClick={() => toggleCell(r, c)}
                  />
                );
              }),
            )}
          </div>
          <div className="mt-2">
            Row: {puzzle.rowCounts.join(', ')} | Col: {puzzle.colCounts.join(', ')}
          </div>
          <button className="mt-2 px-2 py-1 border" onClick={checkPuzzle}>
            Check
          </button>
        </div>
      )}
    </div>
  );
};

export default Battleship;
