import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CellState } from './ai';

import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type * as PIXIType from 'pixi.js';

let PIXI: typeof PIXIType | null = null;

export const FLEET = [5, 4, 3, 3, 2];
const dirs: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const cardDirs: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const CELL = 32;

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

interface Ship {
  id: number;
  len: number;
  row: number;
  col: number;
  vertical: boolean;
}

const boardFromShips = (ships: Ship[], size: number): CellState[][] => {
  const board = createBoard(size, 0);
  for (const s of ships) {
    for (let k = 0; k < s.len; k++) {
      const r = s.row + (s.vertical ? k : 0);
      const c = s.col + (s.vertical ? 0 : k);
      board[r][c] = 1;
    }
  }
  return board;
};

const shipsFromBoard = (board: CellState[][]): Ship[] => {
  const size = board.length;
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const ships: Ship[] = [];
  let id = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 1 && !visited[r][c]) {
        let vertical = false;
        if (r + 1 < size && board[r + 1][c] === 1) vertical = true;
        let len = 0;
        while (
          r + (vertical ? len : 0) < size &&
          c + (vertical ? 0 : len) < size &&
          board[r + (vertical ? len : 0)][c + (vertical ? 0 : len)] === 1
        ) {
          visited[r + (vertical ? len : 0)][c + (vertical ? 0 : len)] = true;
          len++;
        }
        ships.push({ id: id++, len, row: r, col: c, vertical });
      }
    }
  }
  return ships;
};

const canPlaceShip = (
  ships: Ship[],
  id: number,
  row: number,
  col: number,
  vertical: boolean,
  size: number,
): boolean => {
  const board = boardFromShips(
    ships.filter((s) => s.id !== id),
    size,
  );
  const ship = ships.find((s) => s.id === id);
  if (!ship) return false;
  for (let k = 0; k < ship.len; k++) {
    const r = row + (vertical ? k : 0);
    const c = col + (vertical ? 0 : k);
    if (r < 0 || c < 0 || r >= size || c >= size) return false;
    if (board[r][c] === 1) return false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < size && nc < size) {
        if (board[nr][nc] === 1) return false;
      }
    }
  }
  return true;
};

const getShipCells = (
  board: CellState[][],
  r: number,
  c: number,
): [number, number][] => {
  const cells: [number, number][] = [];
  const stack: [number, number][] = [[r, c]];
  const seen = new Set<string>();
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push([x, y]);
    for (const [dr, dc] of cardDirs) {
      const nx = x + dr;
      const ny = y + dc;
      if (
        nx >= 0 &&
        ny >= 0 &&
        nx < board.length &&
        ny < board.length &&
        (board[nx][ny] === 1 || board[nx][ny] === 2)
      ) {
        stack.push([nx, ny]);
      }
    }
  }
  return cells;
};

const isSunk = (board: CellState[][], r: number, c: number): boolean => {
  if (board[r][c] !== 2) return false;
  const cells = getShipCells(board, r, c);
  return cells.every(([x, y]) => board[x][y] === 2);
};

const animateShot = (
  app: PIXIType.Application | undefined,
  r: number,
  c: number,
  hit: boolean,
) => {
  if (!app || !PIXI) return;
  const x = c * (CELL + 4) + CELL / 2;
  const y = r * (CELL + 4) + CELL / 2;
  const g = new PIXI.Graphics();
  if (hit) {
    g.beginFill(0xff0000);
    g.drawCircle(0, 0, 5);
    g.endFill();
  } else {
    g.lineStyle(2, 0x00ffff);
    g.drawCircle(0, 0, 10);
  }
  g.x = x;
  g.y = y;
  app.stage.addChild(g);
  let life = 0;
  app.ticker.add(function tick(delta) {
    life += delta;
    g.alpha -= 0.02 * delta;
    g.scale.set(1 + life * 0.05);
    if (g.alpha <= 0) {
      app.ticker.remove(tick);
      g.destroy();
    }
  });
};

const Battleship: React.FC = () => {
  const size = 10;
  const initialShips = useRef<Ship[]>();
  if (!initialShips.current) initialShips.current = shipsFromBoard(placeFleet(size));
  const [ships, setShips] = useState<Ship[]>(initialShips.current);
  const [phase, setPhase] = useState<'placement' | 'battle'>('placement');
  const [mode, setMode] = useState<'classic' | 'salvo'>('classic');
  const [playerBoard, setPlayerBoard] = useState<CellState[][]>(() =>
    boardFromShips(initialShips.current!, size),
  );
  const [aiBoard, setAiBoard] = useState<CellState[][]>(() => placeFleet(size));
  const [playerKnowledge, setPlayerKnowledge] = useState<CellState[][]>(() => createBoard(size, 0));
  const [aiKnowledge, setAiKnowledge] = useState<CellState[][]>(() => createBoard(size, 0));
  const [message, setMessage] = useState('Place your ships');
  const [difficulty, setDifficulty] = useState(1);
  const [assist, setAssist] = useState(false);
  const [assistMap, setAssistMap] = useState<number[][]>(() => createBoard(size, 0));
  const [shotsLeft, setShotsLeft] = useState(1);

  const enemyFx = useRef<PIXI.Application>();
  const playerFx = useRef<PIXI.Application>();
  const enemyFxRef = useRef<HTMLDivElement>(null);
  const playerFxRef = useRef<HTMLDivElement>(null);

  const workerRef = useRef<Worker>();
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url));
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;
    (async () => {
      const m = await import('pixi.js');
      if (!mounted) return;
      PIXI = m;
      enemyFx.current = new m.Application({
        width: size * (CELL + 4) - 4,
        height: size * (CELL + 4) - 4,
        backgroundAlpha: 0,
      });
      playerFx.current = new m.Application({
        width: size * (CELL + 4) - 4,
        height: size * (CELL + 4) - 4,
        backgroundAlpha: 0,
      });
      if (enemyFxRef.current)
        enemyFxRef.current.appendChild(enemyFx.current.view as any);
      if (playerFxRef.current)
        playerFxRef.current.appendChild(playerFx.current.view as any);
    })();
    return () => {
      mounted = false;
      enemyFx.current?.destroy(true);
      playerFx.current?.destroy(true);
    };
  }, []);

  const ShipPiece: React.FC<{ ship: Ship }> = ({ ship }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: ship.id.toString(),
    });
    const tx = transform ? transform.x : 0;
    const ty = transform ? transform.y : 0;
    const newRow = ship.row + Math.round(ty / CELL);
    const newCol = ship.col + Math.round(tx / CELL);
    const valid = canPlaceShip(ships, ship.id, newRow, newCol, ship.vertical, size);
    const style = {
      width: (ship.vertical ? 1 : ship.len) * CELL,
      height: (ship.vertical ? ship.len : 1) * CELL,
      backgroundColor: valid ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.7)',
      transform: CSS.Translate.toString({
        x: ship.col * CELL + tx,
        y: ship.row * CELL + ty,
      }),
    } as React.CSSProperties;
    const handleDoubleClick = () => {
      const nv = !ship.vertical;
      if (canPlaceShip(ships, ship.id, ship.row, ship.col, nv, size)) {
        setShips((sh) => {
          const upd = sh.map((s) =>
            s.id === ship.id ? { ...s, vertical: nv } : s,
          );
          setPlayerBoard(boardFromShips(upd, size));
          return upd;
        });
      }
    };
    return (
      <div
        ref={setNodeRef}
        className="absolute opacity-80"
        style={style}
        onDoubleClick={handleDoubleClick}
        {...attributes}
        {...listeners}
      />
    );
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const id = Number(e.active.id);
    const ship = ships.find((s) => s.id === id);
    if (!ship) return;
    const newRow = ship.row + Math.round(e.delta.y / CELL);
    const newCol = ship.col + Math.round(e.delta.x / CELL);
    if (canPlaceShip(ships, id, newRow, newCol, ship.vertical, size)) {
      setShips((sh) => {
        const upd = sh.map((s) =>
          s.id === id ? { ...s, row: newRow, col: newCol } : s,
        );
        setPlayerBoard(boardFromShips(upd, size));
        return upd;
      });
    }
  };

  const startGame = () => {
    setPlayerBoard(boardFromShips(ships, size));
    setPlayerKnowledge(createBoard(size, 0));
    setAiKnowledge(createBoard(size, 0));
    setAiBoard(placeFleet(size));
    setPhase('battle');
    setMessage('Your turn');
    startTurn();
  };

  const randomize = () => {
    const ns = shipsFromBoard(placeFleet(size));
    setShips(ns);
    setPlayerBoard(boardFromShips(ns, size));
  };

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
    if (phase !== 'battle') return;
    if (aiBoard[r][c] === 2 || aiBoard[r][c] === 3) return;
    const hit = aiBoard[r][c] === 1;
    const nb = shoot(aiBoard, r, c);
    const sunk = hit && isSunk(nb, r, c);
    setAiBoard(nb);
    animateShot(enemyFx.current, r, c, hit);
    setPlayerKnowledge((k) => {
      const nk = k.map((row) => row.slice());
      nk[r][c] = hit ? 2 : 1;
      return nk;
    });
    const label = `${String.fromCharCode(65 + c)}-${r + 1}`;
    setMessage(`${hit ? (sunk ? 'Sunk' : 'Hit') : 'Miss'} at ${label}`);
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
        const nb = shoot(playerBoard, shot.row, shot.col);
        const sunk = hit && isSunk(nb, shot.row, shot.col);
        setPlayerBoard(nb);
        animateShot(playerFx.current, shot.row, shot.col, hit);
        setAiKnowledge((k) => {
          const nk = k.map((row) => row.slice());
          nk[shot.row][shot.col] = hit ? 2 : 1;
          return nk;
        });
        const label = `${String.fromCharCode(65 + shot.col)}-${shot.row + 1}`;
        setMessage(`AI ${hit ? (sunk ? 'sunk' : 'hit') : 'miss'} at ${label}`);
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
    fxRef?: React.RefObject<HTMLDivElement>,
  ) => {
    const max = map ? Math.max(...map.flat()) : 0;
    const boardPx = size * CELL + (size - 1) * 4;
    return (
      <div className="relative" style={{ width: boardPx, height: boardPx }}>
        <div ref={fxRef} className="absolute inset-0 pointer-events-none" />
        <div
          role="grid"
          aria-label={name}
          className="grid gap-1 absolute inset-0"
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
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Battleship</h1>
      {phase === 'battle' && (
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
      )}
      <div className="text-sm" aria-live="polite">
        {message}
      </div>
      {phase === 'placement' ? (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex space-x-4">
            <div
              className="relative"
              style={{ width: size * CELL, height: size * CELL }}
            >
              <div
                className="grid absolute inset-0"
                style={{ gridTemplateColumns: `repeat(${size}, ${CELL}px)` }}
              >
                {Array.from({ length: size * size }).map((_, i) => (
                  <div
                    key={i}
                    style={{ width: CELL, height: CELL }}
                    className="border"
                  />
                ))}
              </div>
              {ships.map((s) => (
                <ShipPiece key={s.id} ship={s} />
              ))}
            </div>
            <div className="flex flex-col space-y-2">
              <button className="px-2 py-1 border" onClick={randomize}>
                Randomize
              </button>
              <button className="px-2 py-1 border" onClick={startGame}>
                Start
              </button>
            </div>
          </div>
        </DndContext>
      ) : (
        <div className="flex space-x-4">
          <div>
            <h2>Your Board</h2>
            {boardView(playerBoard, () => {}, 'Your board', undefined, playerFxRef)}
          </div>
          <div>
            <h2>Enemy Board</h2>
            {boardView(
              aiBoard,
              playerShot,
              'Enemy board',
              assist ? assistMap : undefined,
              enemyFxRef,
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Battleship;
