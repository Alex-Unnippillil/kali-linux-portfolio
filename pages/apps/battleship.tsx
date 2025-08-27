import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io, Socket } from 'socket.io-client';
import { BOARD_SIZE, SHIPS } from '../../components/apps/battleship/ai';

const rand = (n: number) => Math.floor(Math.random() * n);
const shuffle = <T,>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

interface Layout {
  x: number;
  y: number;
  dir: number;
  len: number;
  cells: number[];
}

function randomLayout(hits: Set<number>, misses: Set<number>): Layout[] | null {
  const grid = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
  const hitSet = new Set(hits);
  misses.forEach((m) => (grid[m] = -1));
  hits.forEach((h) => (grid[h] = 2));
  const layout: Layout[] = [];

  const canPlace = (
    x: number,
    y: number,
    dir: number,
    len: number
  ): number[] | null => {
    const cells: number[] = [];
    for (let i = 0; i < len; i++) {
      const cx = x + (dir === 0 ? i : 0);
      const cy = y + (dir === 1 ? i : 0);
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return null;
      const idx = cy * BOARD_SIZE + cx;
      if (grid[idx] === -1 || grid[idx] === 1) return null;
      cells.push(idx);
    }
    return cells;
  };

  const shipLens = SHIPS.slice();
  shuffle(shipLens);

  const placeShip = (i: number): boolean => {
    if (i >= shipLens.length) return true;
    const len = shipLens[i];
    const options: Layout[] = [];
    for (let dir = 0; dir < 2; dir++) {
      const maxX = dir === 0 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      const maxY = dir === 1 ? BOARD_SIZE - len : BOARD_SIZE - 1;
      for (let x = 0; x <= maxX; x++) {
        for (let y = 0; y <= maxY; y++) {
          const cells = canPlace(x, y, dir, len);
          if (cells) options.push({ x, y, dir, len, cells });
        }
      }
    }
    shuffle(options);
    for (const opt of options) {
      opt.cells.forEach((c) => (grid[c] = 1));
      layout.push(opt);
      if (placeShip(i + 1)) return true;
      layout.pop();
      opt.cells.forEach((c) => (grid[c] = hitSet.has(c) ? 2 : 0));
    }
    return false;
  };

  if (!placeShip(0)) return null;

  const allCells = new Set<number>();
  layout.forEach((sh) => sh.cells.forEach((c) => allCells.add(c)));
  for (const h of hits) {
    if (!allCells.has(h)) return null;
  }

  return layout;
}

function estimateProbabilities(
  hits: Set<number>,
  misses: Set<number>,
  simulations = 200
): number[] {
  const scores = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
  for (let s = 0; s < simulations; s++) {
    const layout = randomLayout(hits, misses);
    if (!layout) continue;
    const occ = new Set<number>();
    layout.forEach((sh) => sh.cells.forEach((c) => occ.add(c)));
    for (let i = 0; i < scores.length; i++) {
      if (hits.has(i) || misses.has(i)) continue;
      if (occ.has(i)) scores[i]++;
    }
  }
  const max = Math.max(...scores);
  return scores.map((v) => (max ? v / max : 0));
}

export default function BattleshipPage() {
  const router = useRouter();
  const room =
    typeof router.query.room === 'string' ? router.query.room : 'default';
  const socketRef = useRef<Socket | null>(null);
  const [board, setBoard] = useState<(null | 'hit' | 'miss' | 'pending')[]>(
    Array(BOARD_SIZE * BOARD_SIZE).fill(null)
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [prob, setProb] = useState<number[]>(
    Array(BOARD_SIZE * BOARD_SIZE).fill(0)
  );
  const shotsPerTurn = 3;

  useEffect(() => {
    const socket: Socket = io({ path: '/api/battleship/socket.io' });
    socket.emit('join', room);
    socket.on('update', ({ results }) => {
      setBoard((prev) => {
        const nb = prev.slice();
        results.forEach((r: any) => {
          nb[r.idx] = r.hit ? 'hit' : 'miss';
        });
        return nb;
      });
    });
    socketRef.current = socket;
    return () => socket.disconnect();
  }, [room]);

  useEffect(() => {
    const hits = new Set<number>();
    const misses = new Set<number>();
    board.forEach((c, idx) => {
      if (c === 'hit') hits.add(idx);
      else if (c === 'miss') misses.add(idx);
    });
    setProb(estimateProbabilities(hits, misses));
  }, [board]);

  const toggle = (idx: number) => {
    if (board[idx]) return;
    setSelected((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= shotsPerTurn) return prev;
      return [...prev, idx];
    });
  };

  const fire = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('salvo', { room, cells: selected });
    setBoard((prev) => {
      const nb = prev.slice();
      selected.forEach((i) => (nb[i] = 'pending'));
      return nb;
    });
    setSelected([]);
  };

  return (
    <div className="p-4 text-white">
      <div className="mb-2">Select up to {shotsPerTurn} targets then fire.</div>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE},32px)` }}
      >
        {board.map((cell, idx) => {
          const probVal = prob[idx];
          const color = `rgba(0,255,0,${probVal})`;
          return (
            <div
              key={idx}
              className="relative w-8 h-8 border border-gray-600"
            >
              {!board[idx] && (
                <button className="w-full h-full" onClick={() => toggle(idx)} />
              )}
              {selected.includes(idx) && (
                <div className="absolute inset-0 bg-yellow-300 opacity-50" />
              )}
              {cell === 'hit' && (
                <div className="absolute inset-0 bg-red-500 opacity-50" />
              )}
              {cell === 'miss' && (
                <div className="absolute inset-0 bg-white opacity-25" />
              )}
              {cell === 'pending' && (
                <div className="absolute inset-0 bg-gray-400 opacity-25 animate-pulse" />
              )}
              {(!cell || cell === 'pending') && probVal > 0 && (
                <div
                  className="absolute inset-0"
                  style={{ background: color }}
                />
              )}
            </div>
          );
        })}
      </div>
      <button
        className="mt-4 px-2 py-1 bg-gray-700"
        onClick={fire}
        disabled={!selected.length}
      >
        Fire Salvo
      </button>
    </div>
  );
}
