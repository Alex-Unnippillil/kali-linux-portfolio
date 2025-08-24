import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CellState } from './ai';

export const FLEET = [5, 4, 3, 3, 2];
const dirs: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export const createBoard = (size: number, fill: number = 0): CellState[][] =>
  Array.from({ length: size }, () => Array(size).fill(fill as CellState));

export const placeFleet = (size: number): CellState[][] => {
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

export const shoot = (board: CellState[][], r: number, c: number): CellState[][] => {
  const clone = board.map((row) => row.slice());
  clone[r][c] = board[r][c] === 1 ? 2 : 3; // 2=hit,3=miss
  return clone;
};

const Battleship: React.FC = () => {
  const size = 10;
  const [mode, setMode] = useState<'classic' | 'salvo'>('classic');
  const [playerBoard, setPlayerBoard] = useState<CellState[][]>(() => placeFleet(size));
  const [aiBoard, setAiBoard] = useState<CellState[][]>(() => placeFleet(size));
  const [playerKnowledge, setPlayerKnowledge] = useState<CellState[][]>(() => createBoard(size, 0));
  const [aiKnowledge, setAiKnowledge] = useState<CellState[][]>(() => createBoard(size, 0));
  const [message, setMessage] = useState('Your turn');
  const [difficulty, setDifficulty] = useState(1);
  const [assist, setAssist] = useState(false);
  const [assistMap, setAssistMap] = useState<number[][]>(() => createBoard(size, 0));
  const [shotsLeft, setShotsLeft] = useState(1);

  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url));
    return () => workerRef.current?.terminate();
  }, []);

  const startTurn = useCallback(() => {
    setShotsLeft(mode === 'salvo' ? FLEET.length : 1);
  }, [mode]);

  useEffect(() => {
    startTurn();
  }, [startTurn]);

  const requestMap = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.onmessage = (e: MessageEvent<{ map: number[][] }>) => {
      setAssistMap(e.data.map);
    };
    workerRef.current.postMessage({ type: 'map', board: playerKnowledge });
  }, [playerKnowledge]);

  useEffect(() => {
    if (assist) requestMap();
  }, [assist, playerKnowledge, requestMap]);

  const playerShot = (r: number, c: number) => {
    if (aiBoard[r][c] === 2 || aiBoard[r][c] === 3) return;
    const hit = aiBoard[r][c] === 1;
    setAiBoard((b) => shoot(b, r, c));
    setPlayerKnowledge((k) => {
      const nk = k.map((row) => row.slice());
      nk[r][c] = hit ? 2 : 1;
      return nk;
    });
    setMessage(`${hit ? 'Hit' : 'Miss'} at ${String.fromCharCode(65 + c)}-${r + 1}`);
    setShotsLeft((s) => {
      const ns = s - 1;
      if (ns <= 0) setTimeout(aiTurn, 0);
      return ns;
    });
  };

  const aiTurn = () => {
    const shots = mode === 'salvo' ? FLEET.length : 1;
    let fired = 0;
    const fire = () => {
      if (!workerRef.current) return;
      workerRef.current.onmessage = (e: MessageEvent<{ shot: { row: number; col: number } }>) => {
        const shot = e.data.shot;
        const hit = playerBoard[shot.row][shot.col] === 1;
        setPlayerBoard((b) => shoot(b, shot.row, shot.col));
        setAiKnowledge((k) => {
          const nk = k.map((row) => row.slice());
          nk[shot.row][shot.col] = hit ? 2 : 1;
          return nk;
        });
        setMessage(`AI ${hit ? 'hit' : 'miss'} at ${String.fromCharCode(65 + shot.col)}-${shot.row + 1}`);
        fired++;
        if (fired < shots) fire();
        else startTurn();
      };
      workerRef.current.postMessage({ type: 'shot', board: aiKnowledge, difficulty });
    };
    fire();
  };

  const boardView = (
    board: CellState[][],
    click: (r: number, c: number) => void,
    name: string,
    map?: number[][],
  ) => {
    const max = map ? Math.max(...map.flat()) : 0;
    return (
      <div
        role="grid"
        aria-label={name}
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${board.length}, 1fr)` }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            let label = `${String.fromCharCode(65 + c)}-${r + 1}`;
            let className = 'relative w-8 h-8 flex items-center justify-center border';
            if (cell === 2) {
              className += ' bg-red-500';
              label += ', hit';
            } else if (cell === 3) {
              className += ' bg-gray-300';
              label += ', miss';
            }
            const alpha = map && max > 0 ? map[r][c] / max : 0;
            return (
              <button
                key={`${r}-${c}`}
                role="gridcell"
                aria-label={label}
                className={className}
                onClick={() => click(r, c)}
              >
                {assist && map && (
                  <div
                    className="absolute inset-0"
                    style={{ background: `rgba(0,0,255,${alpha * 0.5})` }}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Battleship</h1>
      <div>
        <label>
          Mode:
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="ml-2">
            <option value="classic">Classic</option>
            <option value="salvo">Salvo</option>
          </select>
        </label>
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
        <label className="ml-4 flex items-center">
          Assist
          <input
            type="checkbox"
            className="ml-1"
            checked={assist}
            onChange={(e) => setAssist(e.target.checked)}
          />
        </label>
      </div>
      <div className="text-sm" aria-live="polite">
        {message}
      </div>
      <div className="flex space-x-4">
        <div>
          <h2>Your Board</h2>
          {boardView(playerBoard, () => {}, 'Your board')}
        </div>
        <div>
          <h2>Enemy Board</h2>
          {boardView(aiBoard, playerShot, 'Enemy board', assist ? assistMap : undefined)}
        </div>
      </div>
    </div>
  );
};

export default Battleship;
