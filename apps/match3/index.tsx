import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

export type PieceType = 'normal' | 'stripedH' | 'stripedV' | 'wrapped' | 'bomb';

export interface Piece {
  color: string;
  type: PieceType;
  id: number;
}

export interface Node {
  x: number;
  y: number;
  piece: Piece | null;
}

export interface Board {
  size: number;
  nodes: Map<string, Node>;
}

interface CrushAnim {
  id: number;
  x: number;
  y: number;
  color: string;
}

const COLORS = ['#ff6666', '#66b3ff', '#66ff66', '#ffcc66', '#cc66ff'];
const BOARD_SIZE = 8;
const MAX_CHAIN = 10;
const MOVE_LIMIT = 30;
let uid = 0;


export const rngFactory = (seed = 1) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export const createBoard = (
  size = BOARD_SIZE,
  seedOrRand: number | (() => number) = Date.now(),
): Board => {
  const rand = typeof seedOrRand === 'function' ? seedOrRand : rngFactory(seedOrRand);
  const nodes = new Map<string, Node>();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      nodes.set(key(x, y), {
        x,
        y,
        piece: {
          color: COLORS[Math.floor(rand() * COLORS.length)],
          type: 'normal',
          id: uid++,
        },
      });
    }
  }
  return { size, nodes };
};

const cloneBoard = (b: Board): Board => {
  const nodes = new Map<string, Node>();
  b.nodes.forEach((n, k) => {
    nodes.set(k, { x: n.x, y: n.y, piece: n.piece ? { ...n.piece } : null });
  });
  return { size: b.size, nodes };
};

export const hasValidMove = (board: Board): boolean => {
  const size = board.size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (
        x < size - 1 &&
        swapPieces(cloneBoard(board), { x, y }, { x: x + 1, y }).swapped
      )
        return true;
      if (
        y < size - 1 &&
        swapPieces(cloneBoard(board), { x, y }, { x, y: y + 1 }).swapped
      )
        return true;
    }
  }
  return false;
};

export const initializeBoard = (
  size = BOARD_SIZE,
  seed = Date.now(),
): { board: Board; rand: () => number; seed: number } => {
  let s = seed;
  while (true) {
    const rand = rngFactory(s);
    const board = createBoard(size, rand);
    resolveBoard(board, rand);
    if (hasValidMove(board)) return { board, rand, seed: s };
    s++;
  }
};

export const areAdjacent = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

const key = (x: number, y: number) => `${x},${y}`;

export const findMatches = (board: Board): Set<string> => {
  const size = board.size;
  const matches = new Set<string>();
  const visited = new Set<string>();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = key(x, y);
      if (visited.has(k)) continue;
      const piece = board.nodes.get(k)?.piece;
      if (!piece) continue;
      const queue: string[] = [k];
      const group: string[] = [];
      visited.add(k);
      while (queue.length) {
        const cur = queue.pop()!;
        group.push(cur);
        const [cx, cy] = cur.split(',').map(Number);
        const neigh = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        neigh.forEach(([nx, ny]) => {
          const nk = key(nx, ny);
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < size &&
            ny < size &&
            !visited.has(nk)
          ) {
            const np = board.nodes.get(nk)?.piece;
            if (np && np.color === piece.color) {
              visited.add(nk);
              queue.push(nk);
            }
          }
        });
      }
      if (group.length >= 3) {
        group.forEach((g) => matches.add(g));
      }
    }
  }

  return matches;
};

const triggerSpecial = (
  board: Board,
  x: number,
  y: number,
  matches: Set<string>,
): void => {
  const size = board.size;
  const p = board.nodes.get(key(x, y))?.piece;
  if (!p) return;
  switch (p.type) {
    case 'stripedH':
      for (let i = 0; i < size; i++) matches.add(key(i, y));
      break;
    case 'stripedV':
      for (let i = 0; i < size; i++) matches.add(key(x, i));
      break;
    case 'wrapped':
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) matches.add(key(nx, ny));
        }
      break;
    case 'bomb':
      const color = p.color;
      for (let j = 0; j < size; j++)
        for (let i = 0; i < size; i++) {
          const bp = board.nodes.get(key(i, j))?.piece;
          if (bp && bp.color === color) matches.add(key(i, j));
        }
      break;
  }
};

const removeMatches = (
  board: Board,
  matches: Set<string>,
): CrushAnim[] => {
  const removed: CrushAnim[] = [];
  matches.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    const p = board.nodes.get(key(x, y))?.piece;
    if (p && p.type !== 'normal') {
      triggerSpecial(board, x, y, matches);
    }
  });
  matches.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    const node = board.nodes.get(key(x, y));
    if (node && node.piece) {
      removed.push({ id: node.piece.id, x, y, color: node.piece.color });
      node.piece = null;
    }
  });
  return removed;
};

const applyGravity = (board: Board, rand: () => number): void => {
  const size = board.size;
  for (let x = 0; x < size; x++) {
    for (let y = size - 1; y >= 0; y--) {
      const node = board.nodes.get(key(x, y));
      if (node && !node.piece) {
        for (let k = y - 1; k >= 0; k--) {
          const above = board.nodes.get(key(x, k));
          if (above && above.piece) {
            node.piece = above.piece;
            above.piece = null;
            break;
          }
        }
        if (!node.piece) {
          node.piece = {
            color: COLORS[Math.floor(rand() * COLORS.length)],
            type: 'normal',
            id: uid++,
          };
        }
      }
    }
  }
};

const createSpecialFromMatch = (
  board: Board,
  match: Set<string>,
  origin: { x: number; y: number },
  target: { x: number; y: number },
): void => {
  if (match.size < 3) return;
  const pos = target;
  const coords = Array.from(match).map((k) => k.split(',').map(Number));
  const horizontal = coords.filter(([x, y]) => y === pos.y).length >= 3;
  const vertical = coords.filter(([x, y]) => x === pos.x).length >= 3;
  if (match.size >= 5) {
    const node = board.nodes.get(key(pos.x, pos.y));
    if (node && node.piece) {
      node.piece = { color: node.piece.color, type: 'bomb', id: uid++ };
    }
  } else if (horizontal && vertical) {
    const node = board.nodes.get(key(pos.x, pos.y));
    if (node && node.piece) {
      node.piece = { color: node.piece.color, type: 'wrapped', id: uid++ };
    }
  } else if (horizontal) {
    const node = board.nodes.get(key(pos.x, pos.y));
    if (node && node.piece) {
      node.piece = { color: node.piece.color, type: 'stripedH', id: uid++ };
    }
  } else if (vertical) {
    const node = board.nodes.get(key(pos.x, pos.y));
    if (node && node.piece) {
      node.piece = { color: node.piece.color, type: 'stripedV', id: uid++ };
    }
  }
};

const handleSpecialSwap = (
  board: Board,
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean => {
  const matches = new Set<string>();
  const p1 = board.nodes.get(key(a.x, a.y))?.piece;
  const p2 = board.nodes.get(key(b.x, b.y))?.piece;
  if (!p1 || !p2) return false;
  const size = board.size;
  const addAll = () => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) matches.add(key(x, y));
  };
  if (p1.type === 'bomb' && p2.type === 'bomb') {
    addAll();
  } else if (p1.type === 'bomb') {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (board.nodes.get(key(x, y))?.piece?.color === p2.color) matches.add(key(x, y));
  } else if (p2.type === 'bomb') {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (board.nodes.get(key(x, y))?.piece?.color === p1.color) matches.add(key(x, y));
  } else if (p1.type.startsWith('striped') && p2.type.startsWith('striped')) {
    for (let i = 0; i < size; i++) {
      matches.add(key(i, a.y));
      matches.add(key(b.x, i));
    }
  } else if (
    (p1.type.startsWith('striped') && p2.type === 'wrapped') ||
    (p2.type.startsWith('striped') && p1.type === 'wrapped')
  ) {
    const center = b;
    for (let dy = -1; dy <= 1; dy++) {
      for (let i = 0; i < size; i++) {
        const y = center.y + dy;
        if (y >= 0 && y < size) matches.add(key(i, y));
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let i = 0; i < size; i++) {
        const x = center.x + dx;
        if (x >= 0 && x < size) matches.add(key(x, i));
      }
    }
  } else if (p1.type === 'wrapped' && p2.type === 'wrapped') {
    const cx = a.x;
    const cy = a.y;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) matches.add(key(x, y));
      }
  } else {
    triggerSpecial(board, a.x, a.y, matches);
    triggerSpecial(board, b.x, b.y, matches);
  }
  removeMatches(board, matches);
  return matches.size > 0;
};

export const resolveBoard = (
  board: Board,
  rand: () => number,
  maxChain = MAX_CHAIN,
  origin?: { x: number; y: number },
  target?: { x: number; y: number },
): { board: Board; chain: number; anims: CrushAnim[][] } => {
  let chain = 0;
  const anims: CrushAnim[][] = [];
  while (chain < maxChain) {
    const matches = findMatches(board);
    if (matches.size === 0) break;
    if (origin && target && chain === 0) {
      createSpecialFromMatch(board, matches, origin, target);
      matches.delete(key(target.x, target.y));
    }
    const removed = removeMatches(board, matches);
    anims.push(removed);
    applyGravity(board, rand);
    chain++;
  }
  return { board, chain, anims };
};

export const swapPieces = (
  board: Board,
  a: { x: number; y: number },
  b: { x: number; y: number },
  rand: () => number = Math.random,
  maxChain = MAX_CHAIN,
): { board: Board; swapped: boolean; chain: number; anims: CrushAnim[][] } => {
  if (!areAdjacent(a, b)) return { board, swapped: false, chain: 0, anims: [] };
  const newBoard = cloneBoard(board);
  const nodeA = newBoard.nodes.get(key(a.x, a.y));
  const nodeB = newBoard.nodes.get(key(b.x, b.y));
  const temp = nodeA?.piece;
  if (!nodeA || !nodeB) return { board, swapped: false, chain: 0, anims: [] };
  nodeA.piece = nodeB.piece;
  nodeB.piece = temp;
  const p1 = nodeA.piece;
  const p2 = nodeB.piece;

  let matches = findMatches(newBoard);
  if (p1 && p2 && (p1.type !== 'normal' || p2.type !== 'normal')) {
    const specialTriggered = handleSpecialSwap(newBoard, a, b);
    if (!specialTriggered) {
      return { board, swapped: false, chain: 0, anims: [] };
    }
    const res = resolveBoard(newBoard, rand, maxChain);
    return { board: res.board, swapped: true, chain: res.chain, anims: res.anims };
  }
  if (matches.size === 0) {
    return { board, swapped: false, chain: 0, anims: [] };
  }
  const res = resolveBoard(newBoard, rand, maxChain, a, b);
  return { board: res.board, swapped: true, chain: res.chain, anims: res.anims };
};

export const resolveBoardAsync = (
  board: Board,
  seed: number,
  maxChain = MAX_CHAIN,
): Promise<{ board: Board; chain: number; anims: CrushAnim[][] }> => {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(resolveBoard(board, rngFactory(seed), maxChain));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url));
    worker.postMessage({ board, seed, maxChain });
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
  });
};

// React component
const cellSize = 40;

const Match3: React.FC = () => {
  const router = useRouter();
  const rngRef = useRef<() => number>(() => Math.random);
  const [board, setBoard] = useState<Board | null>(null);
  const [sel, setSel] = useState<{ x: number; y: number } | null>(null);
  const [movesLeft, setMovesLeft] = useState(MOVE_LIMIT);
  const [cascades, setCascades] = useState(0);
  const [animations, setAnimations] = useState<CrushAnim[]>([]);

  useEffect(() => {
    const seedParam = router.query.seed;
    const parsed = typeof seedParam === 'string' ? parseInt(seedParam, 10) : Date.now();
    const { board: b, rand } = initializeBoard(BOARD_SIZE, Number.isNaN(parsed) ? Date.now() : parsed);
    rngRef.current = rand;
    setBoard(cloneBoard(b));
  }, [router.query.seed]);

  const handleClick = (x: number, y: number) => {
    if (movesLeft <= 0) return;
    if (!sel) {
      setSel({ x, y });
      return;
    }
    if (!board) return;
    const res = swapPieces(board, sel, { x, y }, rngRef.current);
    setBoard(cloneBoard(res.board));
    setSel(null);
    if (res.swapped) {
      setMovesLeft((m) => m - 1);
      setCascades(res.chain);
      const pool: CrushAnim[] = [];
      res.anims.forEach((step) => step.forEach((a) => pool.push(a)));
      setAnimations(pool);
      if (pool.length) {
        setTimeout(() => setAnimations([]), 300);
      }
    }
  };

  if (!board) return null;

  return (
    <div className="p-2 text-white">
      <div className="mb-2">Moves: {movesLeft} | Cascades: {cascades}</div>
      <div
        className="relative"
        style={{ width: BOARD_SIZE * cellSize, height: BOARD_SIZE * cellSize }}
      >
        {Array.from({ length: board.size }).map((_, y) =>
          Array.from({ length: board.size }).map((_, x) => {
            const p = board.nodes.get(key(x, y))?.piece;
            return p ? (
              <div
                key={p.id}
                onClick={() => handleClick(x, y)}
                className="absolute cursor-pointer border border-gray-700 rounded"
                style={{
                  width: cellSize - 4,
                  height: cellSize - 4,
                  backgroundColor: p.color,
                  left: x * cellSize,
                  top: y * cellSize,
                  transition: 'left 0.2s, top 0.2s',
                  boxShadow:
                    sel && sel.x === x && sel.y === y
                      ? '0 0 5px 2px #fff'
                      : 'none',
                }}
              />
            ) : null;
          }),
        )}
        {animations.map((a) => (
          <div
            key={`anim-${a.id}-${a.x}-${a.y}`}
            className="absolute pointer-events-none rounded"
            style={{
              width: cellSize - 4,
              height: cellSize - 4,
              backgroundColor: a.color,
              left: a.x * cellSize,
              top: a.y * cellSize,
              animation: 'fade 0.3s forwards',
            }}
          />
        ))}
        <style jsx>{`
          @keyframes fade {
            to {
              opacity: 0;
              transform: scale(0.5);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Match3;
