import usePersistentState from '../../hooks/usePersistentState';

export const BOARD_WIDTH = 8;
export const CANDY_COLORS = ['#ff6666', '#66b3ff', '#66ff66', '#ffcc66', '#cc66ff'];

export interface Cascade {
  matches: number[][];
}

export interface ResolveResult {
  board: string[];
  cascades: Cascade[];
  cleared: number;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const randomColor = (colors: string[], rng: () => number): string => {
  const idx = Math.floor(rng() * colors.length) % colors.length;
  return colors[idx];
};

export const createBoard = (
  width = BOARD_WIDTH,
  colors: string[] = CANDY_COLORS,
  rng: () => number = Math.random,
): string[] => Array.from({ length: width * width }, () => randomColor(colors, rng));

export const findMatches = (
  board: readonly string[],
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
      const color = board[index];
      if (!isNonEmptyString(color)) {
        index += 1;
        continue;
      }
      let next = index + 1;
      while (next < end && board[next] === color) {
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
      const color = board[index];
      if (!isNonEmptyString(color)) {
        index += width;
        continue;
      }
      const group: number[] = [index];
      let next = index + width;
      while (next < size && board[next] === color) {
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
  board: readonly string[],
  width = BOARD_WIDTH,
  colors: string[] = CANDY_COLORS,
  rng: () => number = Math.random,
): string[] => {
  const result = Array(board.length).fill('');
  const rows = Math.floor(board.length / width);

  for (let col = 0; col < width; col += 1) {
    let write = rows - 1;
    for (let row = rows - 1; row >= 0; row -= 1) {
      const index = row * width + col;
      const value = board[index];
      if (isNonEmptyString(value)) {
        result[write * width + col] = value;
        write -= 1;
      }
    }
    while (write >= 0) {
      result[write * width + col] = randomColor(colors, rng);
      write -= 1;
    }
  }

  return result;
};

export const resolveBoard = (
  board: readonly string[],
  width = BOARD_WIDTH,
  colors: string[] = CANDY_COLORS,
  rng: () => number = Math.random,
): ResolveResult => {
  const cascades: Cascade[] = [];
  let current = board.slice();

  while (true) {
    const matches = findMatches(current, width);
    if (matches.length === 0) break;
    cascades.push({ matches });
    const unique = new Set(matches.flat());
    unique.forEach((index) => {
      current[index] = '';
    });
    current = collapseColumns(current, width, colors, rng);
  }

  if (cascades.length === 0) {
    return { board: board.slice(), cascades: [], cleared: 0 };
  }

  const cleared = cascades.reduce((total, cascade) => {
    const unique = new Set<number>();
    cascade.matches.forEach((group) => group.forEach((cell) => unique.add(cell)));
    return total + unique.size;
  }, 0);

  return { board: current, cascades, cleared };
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
  board: readonly string[],
  rng: () => number = Math.random,
): string[] => {
  const next = board.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export interface ColorBombResult {
  board: string[];
  removed: number;
  color: string | null;
}

export const detonateColorBomb = (
  board: readonly string[],
  width = BOARD_WIDTH,
  colors: string[] = CANDY_COLORS,
  rng: () => number = Math.random,
): ColorBombResult => {
  const counts = new Map<string, number>();
  board.forEach((color) => {
    if (isNonEmptyString(color)) {
      counts.set(color, (counts.get(color) ?? 0) + 1);
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

  const cleared = board.map((color) => {
    if (target && color === target) {
      removed += 1;
      return '';
    }
    return color;
  });

  const collapsed = collapseColumns(cleared, width, colors, rng);
  return { board: collapsed, removed, color: target ?? null };
};

export const initialBoosters = Object.freeze({ shuffle: 2, colorBomb: 1 });

export const swapCandies = (
  board: readonly string[],
  a: number,
  b: number,
): string[] => {
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

