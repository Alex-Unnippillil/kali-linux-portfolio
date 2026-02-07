import usePersistentState from '../../hooks/usePersistentState';

export const BOARD_WIDTH = 8;

export interface Cascade {
  matches: number[][];
}

export interface CandyCell {
  id: string;
  gem: string;
}

export interface ResolveResult {
  board: CandyCell[];
  cascades: Cascade[];
  cleared: number;
}

export const GEM_IDS = ['aurora', 'solstice', 'abyss', 'ion', 'pulse'] as const;
export type GemId = (typeof GEM_IDS)[number];

const DEFAULT_POOL: readonly GemId[] = GEM_IDS;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isGemId = (value: unknown): value is GemId =>
  typeof value === 'string' && DEFAULT_POOL.includes(value as GemId);

let candyIdCounter = 0;

const nextCandyId = () => {
  candyIdCounter += 1;
  return `gem-${candyIdCounter}`;
};

const randomGem = (pool: readonly GemId[], rng: () => number): GemId => {
  const idx = Math.floor(rng() * pool.length) % pool.length;
  return pool[idx];
};

const createCandyCell = (gem: GemId): CandyCell => ({
  id: `${gem}-${nextCandyId()}`,
  gem,
});

export const createBoard = (
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: () => number = Math.random,
): CandyCell[] => Array.from({ length: width * width }, () => createCandyCell(randomGem(pool, rng)));

export const findFirstPossibleMove = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
): [number, number] | null => {
  const size = board.length;
  const rows = Math.floor(size / width);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      if (col + 1 < width) {
        const swapped = swapCandies(board, index, index + 1);
        if (findMatches(swapped, width).length > 0) return [index, index + 1];
      }
      if (row + 1 < rows) {
        const swapped = swapCandies(board, index, index + width);
        if (findMatches(swapped, width).length > 0) return [index, index + width];
      }
    }
  }

  return null;
};

export const hasPossibleMoves = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
): boolean => Boolean(findFirstPossibleMove(board, width));

export const createPlayableBoard = (
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: () => number = Math.random,
  maxAttempts = 30,
): CandyCell[] => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seeded = createBoard(width, pool, rng);
    const { board: stable } = resolveBoard(seeded, width, pool, rng);
    if (hasPossibleMoves(stable, width)) return stable;
  }

  return resolveBoard(createBoard(width, pool, rng), width, pool, rng).board;
};

export const findMatches = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
  minMatch = 3,
): number[][] => {
  const groups: number[][] = [];
  const size = board.length;
  const rows = Math.floor(size / width);

  for (let row = 0; row < rows; row += 1) {
    const start = row * width;
    const end = start + width;
    let index = start;
    while (index < end) {
      const color = board[index]?.gem;
      if (!isNonEmptyString(color)) {
        index += 1;
        continue;
      }
      let next = index + 1;
      while (next < end && board[next]?.gem === color) {
        next += 1;
      }
      const length = next - index;
      if (length >= minMatch) {
        const group: number[] = [];
        for (let i = index; i < next; i += 1) {
          group.push(i);
        }
        groups.push(group);
      }
      index = next;
    }
  }

  for (let col = 0; col < width; col += 1) {
    let index = col;
    while (index < size) {
      const color = board[index]?.gem;
      if (!isNonEmptyString(color)) {
        index += width;
        continue;
      }
      const group: number[] = [index];
      let next = index + width;
      while (next < size && board[next]?.gem === color) {
        group.push(next);
        next += width;
      }
      if (group.length >= minMatch) {
        groups.push(group);
      }
      index = next;
    }
  }

  return groups;
};

const collapseColumns = (
  board: readonly (CandyCell | null)[],
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: () => number = Math.random,
): CandyCell[] => {
  const result: (CandyCell | null)[] = Array(board.length).fill(null);
  const rows = Math.floor(board.length / width);

  for (let col = 0; col < width; col += 1) {
    let write = rows - 1;
    for (let row = rows - 1; row >= 0; row -= 1) {
      const index = row * width + col;
      const value = board[index];
      if (value) {
        result[write * width + col] = value;
        write -= 1;
      }
    }
    while (write >= 0) {
      result[write * width + col] = createCandyCell(randomGem(pool, rng));
      write -= 1;
    }
  }

  return result.map((cell) => cell ?? createCandyCell(randomGem(pool, rng)));
};

export const resolveBoard = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: () => number = Math.random,
): ResolveResult => {
  const cascades: Cascade[] = [];
  let current: (CandyCell | null)[] = board.map((cell) => ({ ...cell }));

  while (true) {
    const matches = findMatches(current as CandyCell[], width);
    if (matches.length === 0) break;
    cascades.push({ matches });
    const unique = new Set(matches.flat());
    unique.forEach((index) => {
      current[index] = null;
    });
    current = collapseColumns(current, width, pool, rng);
  }

  if (cascades.length === 0) {
    return { board: board.slice(), cascades: [], cleared: 0 };
  }

  const cleared = cascades.reduce((total, cascade) => {
    const unique = new Set<number>();
    cascade.matches.forEach((group) => group.forEach((cell) => unique.add(cell)));
    return total + unique.size;
  }, 0);

  return { board: current as CandyCell[], cascades, cleared };
};

export const scoreCascade = (cascade: Cascade, chain: number): number => {
  if (chain < 1) return 0;
  const unique = new Set<number>();
  let bonus = 0;
  cascade.matches.forEach((group) => {
    group.forEach((index) => unique.add(index));
    if (group.length > 3) {
      bonus += (group.length - 3) * 5;
    }
  });
  const base = unique.size * 10;
  return (base + bonus) * chain;
};

export const shuffleBoard = (
  board: readonly CandyCell[],
  rng: () => number = Math.random,
): CandyCell[] => {
  const next = board.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export interface ColorBombResult {
  board: CandyCell[];
  removed: number;
  color: GemId | null;
}

export interface RemoveCandyResult {
  board: CandyCell[];
  removed: number;
  color: GemId | null;
}

export const detonateColorBomb = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: () => number = Math.random,
): ColorBombResult => {
  const counts = new Map<GemId, number>();
  board.forEach((cell) => {
    if (isGemId(cell?.gem)) {
      counts.set(cell.gem, (counts.get(cell.gem) ?? 0) + 1);
    }
  });

  if (counts.size === 0) {
    return { board: board.slice(), removed: 0, color: null };
  }

  const max = Math.max(...counts.values());
  const candidates = Array.from(counts.entries()).filter(([, value]) => value === max);
  const choice = candidates[Math.floor(rng() * candidates.length) % candidates.length];
  const target = choice?.[0] ?? null;
  let removed = 0;

  const cleared = board.map((cell) => {
    if (target && cell.gem === target) {
      removed += 1;
      return null;
    }
    return cell;
  });

  const collapsed = collapseColumns(cleared, width, pool, rng);
  return { board: collapsed, removed, color: target ?? null };
};

export const removeCandyAt = (
  board: readonly CandyCell[],
  index: number,
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: () => number = Math.random,
): RemoveCandyResult => {
  if (index < 0 || index >= board.length) {
    return { board: board.slice(), removed: 0, color: null };
  }
  const target = board[index];
  if (!target) {
    return { board: board.slice(), removed: 0, color: null };
  }
  const cleared = board.map((cell, idx) => (idx === index ? null : cell));
  const collapsed = collapseColumns(cleared, width, pool, rng);
  const resolved = resolveBoard(collapsed, width, pool, rng);
  return { board: resolved.board, removed: 1, color: target.gem ?? null };
};

export const initialBoosters = Object.freeze({ shuffle: 2, colorBomb: 1, lollipop: 1 });

export const swapCandies = (
  board: readonly CandyCell[],
  a: number,
  b: number,
): CandyCell[] => {
  const next = board.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
};

export const isAdjacent = (a: number, b: number, width = BOARD_WIDTH): boolean => {
  if (a === b) return false;
  const rowA = Math.floor(a / width);
  const colA = a % width;
  const rowB = Math.floor(b / width);
  const colB = b % width;
  return (Math.abs(rowA - rowB) === 1 && colA === colB) || (Math.abs(colA - colB) === 1 && rowA === rowB);
};

export function useCandyCrushStats() {
  const [bestScore, setBestScore] = usePersistentState('candy-crush:best-score', 0, isNonNegativeNumber);
  const [bestStreak, setBestStreak] = usePersistentState('candy-crush:best-streak', 0, isNonNegativeNumber);

  const updateStats = (score: number, streak: number) => {
    setBestScore((prev) => (score > prev ? score : prev));
    setBestStreak((prev) => (streak > prev ? streak : prev));
  };

  return { bestScore, bestStreak, updateStats };
}
