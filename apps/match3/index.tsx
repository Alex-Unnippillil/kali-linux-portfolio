import React, { useState, useRef } from 'react';

export type PieceType = 'normal' | 'stripedH' | 'stripedV' | 'wrapped' | 'bomb';

export interface Piece {
  color: string;
  type: PieceType;
  id: number;
}

export type Board = (Piece | null)[][];

const COLORS = ['#ff6666', '#66b3ff', '#66ff66', '#ffcc66', '#cc66ff'];
const BOARD_SIZE = 8;
const MAX_CHAIN = 10;
let uid = 0;

export const rngFactory = (seed = 1) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export const createBoard = (size = BOARD_SIZE, seed = Date.now()): Board => {
  const rand = rngFactory(seed);
  const board: Board = [];
  for (let y = 0; y < size; y++) {
    const row: (Piece | null)[] = [];
    for (let x = 0; x < size; x++) {
      row.push({
        color: COLORS[Math.floor(rand() * COLORS.length)],
        type: 'normal',
        id: uid++,
      });
    }
    board.push(row);
  }
  return board;
};

const cloneBoard = (b: Board): Board => b.map((r) => r.map((p) => (p ? { ...p } : null)));

export const areAdjacent = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

const key = (x: number, y: number) => `${x},${y}`;

export const findMatches = (board: Board): Set<string> => {
  const size = board.length;
  const matches = new Set<string>();
  // horizontal
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      const piece = board[y][x];
      if (!piece) {
        x++;
        continue;
      }
      const color = piece.color;
      let len = 1;
      while (
        x + len < size &&
        board[y][x + len] &&
        board[y][x + len]!.color === color
      )
        len++;
      if (len >= 3) {
        for (let k = 0; k < len; k++) matches.add(key(x + k, y));
      }
      x += len;
    }
  }
  // vertical
  for (let x = 0; x < size; x++) {
    let y = 0;
    while (y < size) {
      const piece = board[y][x];
      if (!piece) {
        y++;
        continue;
      }
      const color = piece.color;
      let len = 1;
      while (
        y + len < size &&
        board[y + len][x] &&
        board[y + len][x]!.color === color
      )
        len++;
      if (len >= 3) {
        for (let k = 0; k < len; k++) matches.add(key(x, y + k));
      }
      y += len;
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
  const size = board.length;
  const p = board[y][x];
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
        for (let i = 0; i < size; i++)
          if (board[j][i] && board[j][i]!.color === color) matches.add(key(i, j));
      break;
  }
};

const removeMatches = (board: Board, matches: Set<string>): void => {
  matches.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    const p = board[y][x];
    if (p && p.type !== 'normal') {
      triggerSpecial(board, x, y, matches);
    }
  });
  matches.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    board[y][x] = null;
  });
};

const applyGravity = (board: Board, rand: () => number): void => {
  const size = board.length;
  for (let x = 0; x < size; x++) {
    for (let y = size - 1; y >= 0; y--) {
      if (!board[y][x]) {
        for (let k = y - 1; k >= 0; k--) {
          if (board[k][x]) {
            board[y][x] = board[k][x];
            board[k][x] = null;
            break;
          }
        }
        if (!board[y][x]) {
          board[y][x] = {
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
    board[pos.y][pos.x] = {
      color: board[pos.y][pos.x]!.color,
      type: 'bomb',
      id: uid++,
    };
  } else if (horizontal && vertical) {
    board[pos.y][pos.x] = {
      color: board[pos.y][pos.x]!.color,
      type: 'wrapped',
      id: uid++,
    };
  } else if (horizontal) {
    board[pos.y][pos.x] = {
      color: board[pos.y][pos.x]!.color,
      type: 'stripedH',
      id: uid++,
    };
  } else if (vertical) {
    board[pos.y][pos.x] = {
      color: board[pos.y][pos.x]!.color,
      type: 'stripedV',
      id: uid++,
    };
  }
};

const handleSpecialSwap = (
  board: Board,
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean => {
  const matches = new Set<string>();
  const p1 = board[a.y][a.x];
  const p2 = board[b.y][b.x];
  if (!p1 || !p2) return false;
  const size = board.length;
  const addAll = () => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) matches.add(key(x, y));
  };
  if (p1.type === 'bomb' && p2.type === 'bomb') {
    addAll();
  } else if (p1.type === 'bomb') {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (board[y][x] && board[y][x]!.color === p2.color) matches.add(key(x, y));
  } else if (p2.type === 'bomb') {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (board[y][x] && board[y][x]!.color === p1.color) matches.add(key(x, y));
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
): { board: Board; chain: number } => {
  let chain = 0;
  while (chain < maxChain) {
    const matches = findMatches(board);
    if (matches.size === 0) break;
    if (origin && target && chain === 0) {
      createSpecialFromMatch(board, matches, origin, target);
      matches.delete(key(target.x, target.y));
    }
    removeMatches(board, matches);
    applyGravity(board, rand);
    chain++;
  }
  return { board, chain };
};

export const swapPieces = (
  board: Board,
  a: { x: number; y: number },
  b: { x: number; y: number },
  rand: () => number = Math.random,
  maxChain = MAX_CHAIN,
): { board: Board; swapped: boolean } => {
  if (!areAdjacent(a, b)) return { board, swapped: false };
  const newBoard = cloneBoard(board);
  const temp = newBoard[a.y][a.x];
  newBoard[a.y][a.x] = newBoard[b.y][b.x];
  newBoard[b.y][b.x] = temp;
  const p1 = newBoard[a.y][a.x];
  const p2 = newBoard[b.y][b.x];

  let matches = findMatches(newBoard);
  if (p1 && p2 && (p1.type !== 'normal' || p2.type !== 'normal')) {
    const specialTriggered = handleSpecialSwap(newBoard, a, b);
    if (!specialTriggered) {
      return { board, swapped: false };
    }
    resolveBoard(newBoard, rand, maxChain);
    return { board: newBoard, swapped: true };
  }
  if (matches.size === 0) {
    return { board, swapped: false };
  }
  resolveBoard(newBoard, rand, maxChain, a, b);
  return { board: newBoard, swapped: true };
};

// React component
const cellSize = 40;

const Match3: React.FC = () => {
  const rngRef = useRef(rngFactory());
  const [board, setBoard] = useState<Board>(() => {
    const b = createBoard(BOARD_SIZE, Date.now());
    const rand = rngRef.current;
    resolveBoard(b, rand); // remove initial matches
    return b;
  });
  const [sel, setSel] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (x: number, y: number) => {
    if (!sel) {
      setSel({ x, y });
      return;
    }
    const res = swapPieces(board, sel, { x, y }, rngRef.current);
    setBoard(cloneBoard(res.board));
    setSel(null);
  };

  return (
    <div className="p-2">
      <div
        className="relative"
        style={{ width: BOARD_SIZE * cellSize, height: BOARD_SIZE * cellSize }}
      >
        {board.map((row, y) =>
          row.map((p, x) =>
            p ? (
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
            ) : null,
          ),
        )}
      </div>
    </div>
  );
};

export default Match3;
