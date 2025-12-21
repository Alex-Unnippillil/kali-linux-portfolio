import usePersistentState from '../../hooks/usePersistentState';

export const BOARD_WIDTH = 8;

export interface Rng {
  state: number;
  nextFloat(): number;
}

export const makeRng = (seed: number): Rng => {
  let s = seed >>> 0;
  return {
    get state() {
      return s;
    },
    set state(v: number) {
      s = v >>> 0;
    },
    nextFloat() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
};

export interface Cascade {
  matches: number[][];
}

export type Special = 'striped-h' | 'striped-v' | 'color-bomb';

export interface CandyCell {
  id: string;
  gem: string;
  special?: Special;
}

export interface ResolveResult {
  board: CandyCell[];
  cascades: Cascade[];
  cleared: number;
}

export interface MatchGroup {
  cells: number[];
  kind: 'h' | 'v';
  gem: string;
  length: number;
}

export interface ResolveState {
  board: CandyCell[];
  phase: ResolvePhase;
  chain: number;
  pendingMatches: MatchGroup[];
  clearedLast: number[];
}

export type ResolvePhase = 'idle' | 'clear' | 'fall' | 'refill' | 'check';

export type SwapMode = 'strict' | 'free';

export type SwapResult =
  | { ok: true; board: CandyCell[]; matches: MatchGroup[]; createdSpecial?: CreatedSpecial }
  | { ok: false; board: CandyCell[]; reason: 'not-adjacent' | 'no-match' };

export interface CreatedSpecial {
  index: number;
  special: Special;
  gem: string;
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

const randomGem = (pool: readonly GemId[], rng: Rng): GemId => {
  const idx = Math.floor(rng.nextFloat() * pool.length) % pool.length;
  return pool[idx];
};

const createCandyCell = (gem: GemId): CandyCell => ({
  id: `${gem}-${nextCandyId()}`,
  gem,
});

export type CreateBoardOptions = {
  allowStartingMatches?: boolean;
  ensurePlayable?: boolean;
};

const wouldCompleteLine = (
  board: CandyCell[],
  width: number,
  index: number,
  gem: GemId,
): boolean => {
  const row = Math.floor(index / width);
  const col = index % width;
  if (col >= 2) {
    const left1 = board[index - 1];
    const left2 = board[index - 2];
    if (left1?.gem === gem && left2?.gem === gem) return true;
  }
  if (row >= 2) {
    const up1 = board[index - width];
    const up2 = board[index - 2 * width];
    if (up1?.gem === gem && up2?.gem === gem) return true;
  }
  return false;
};

export const hasAnyValidSwap = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
  minMatch = 3,
): boolean => {
  const size = board.length;
  for (let i = 0; i < size; i += 1) {
    const right = i + 1;
    const down = i + width;
    if (right % width !== 0) {
      const swapped = swapCandies(board, i, right);
      if (findMatches(swapped, width, minMatch).length > 0) return true;
    }
    if (down < size) {
      const swapped = swapCandies(board, i, down);
      if (findMatches(swapped, width, minMatch).length > 0) return true;
    }
  }
  return false;
};

export const createBoard = (
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: Rng = makeRng(Date.now()),
  options: CreateBoardOptions = {},
): CandyCell[] => {
  const { allowStartingMatches = false, ensurePlayable = false } = options;
  let attempts = 0;
  while (attempts < 50) {
    const board: CandyCell[] = Array(width * width)
      .fill(null)
      .map(() => createCandyCell(pool[0]));
    for (let i = 0; i < board.length; i += 1) {
      const candidatePool: GemId[] = [];
      pool.forEach((gem) => {
        if (allowStartingMatches || !wouldCompleteLine(board, width, i, gem)) {
          candidatePool.push(gem);
        }
      });
      let chosen: GemId | undefined;
      for (let retry = 0; retry < 6; retry += 1) {
        const gem = candidatePool[Math.floor(rng.nextFloat() * candidatePool.length) % candidatePool.length];
        if (gem) {
          chosen = gem;
          break;
        }
      }
      chosen = chosen ?? candidatePool[0] ?? pool[0];
      board[i] = createCandyCell(chosen);
    }
    if (!ensurePlayable) return board;
    if (!allowStartingMatches && findMatches(board, width).length > 0) {
      attempts += 1;
      continue;
    }
    if (hasAnyValidSwap(board, width)) return board;
    attempts += 1;
  }
  return Array.from({ length: width * width }, () => createCandyCell(pool[0]));
};

export const findMatches = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
  minMatch = 3,
): MatchGroup[] => {
  const groups: MatchGroup[] = [];
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
        const cells: number[] = [];
        for (let i = index; i < next; i += 1) cells.push(i);
        groups.push({ cells, kind: 'h', gem: color, length });
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
      const cells: number[] = [index];
      let next = index + width;
      while (next < size && board[next]?.gem === color) {
        cells.push(next);
        next += width;
      }
      if (cells.length >= minMatch) {
        groups.push({ cells, kind: 'v', gem: color, length: cells.length });
      }
      index = next;
    }
  }

  return groups;
};

const collapseColumns = (
  board: readonly (CandyCell | null)[],
  width = BOARD_WIDTH,
): (CandyCell | null)[] => {
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
  }

  return result;
};

const fillNulls = (
  board: readonly (CandyCell | null)[],
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: Rng = makeRng(Date.now()),
): CandyCell[] =>
  board.map((cell) => (cell ? cell : createCandyCell(randomGem(pool, rng))));

export const beginResolve = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
): ResolveState => ({
  board: board.map((cell) => ({ ...cell })),
  phase: 'check',
  chain: 0,
  pendingMatches: [],
  clearedLast: [],
});

const expandSpecials = (
  board: readonly CandyCell[],
  width: number,
  clearSet: Set<number>,
) => {
  const size = board.length;
  const targetColors = new Set<string>();
  clearSet.forEach((index) => {
    const cell = board[index];
    if (!cell || !cell.special) return;
    if (cell.special === 'striped-h') {
      const row = Math.floor(index / width);
      for (let col = 0; col < width; col += 1) clearSet.add(row * width + col);
    } else if (cell.special === 'striped-v') {
      const col = index % width;
      for (let row = 0; row < size / width; row += 1) clearSet.add(row * width + col);
    } else if (cell.special === 'color-bomb') {
      const firstGem = Array.from(clearSet)
        .map((i) => board[i]?.gem)
        .find((gem) => gem && gem !== cell.gem);
      const target = firstGem ?? cell.gem;
      if (target) targetColors.add(target);
    }
  });
  if (targetColors.size > 0) {
    board.forEach((cell, index) => {
      if (cell && targetColors.has(cell.gem)) clearSet.add(index);
    });
  }
};

export const stepResolve = (
  state: ResolveState,
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: Rng = makeRng(Date.now()),
): ResolveState => {
  if (state.phase === 'idle') return state;
  if (state.chain > 50) return { ...state, phase: 'idle' };

  if (state.phase === 'check') {
    const matches = findMatches(state.board, width);
    if (matches.length === 0) {
      return { ...state, phase: 'idle', pendingMatches: [], clearedLast: [] };
    }
    return { ...state, phase: 'clear', pendingMatches: matches, clearedLast: [] };
  }

  if (state.phase === 'clear') {
    const clearSet = new Set<number>(state.pendingMatches.flatMap((m) => m.cells));
    expandSpecials(state.board, width, clearSet);
    const nextBoard = state.board.slice();
    clearSet.forEach((index) => {
      nextBoard[index] = null;
    });
    return {
      ...state,
      board: nextBoard as CandyCell[],
      phase: 'fall',
      clearedLast: Array.from(clearSet.values()),
    };
  }

  if (state.phase === 'fall') {
    const collapsed = collapseColumns(state.board, width);
    return { ...state, board: collapsed as CandyCell[], phase: 'refill' };
  }

  if (state.phase === 'refill') {
    const filled = fillNulls(state.board, width, pool, rng);
    const chain = state.clearedLast.length > 0 ? state.chain + 1 : state.chain;
    return { ...state, board: filled, phase: 'check', chain };
  }

  return state;
};

export const resolveBoard = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: Rng = makeRng(Date.now()),
): ResolveResult => {
  const cascades: Cascade[] = [];
  let cleared = 0;
  let state: ResolveState = beginResolve(board, width);
  while (state.phase !== 'idle') {
    const before = state;
    state = stepResolve(state, width, pool, rng);
    if (before.phase === 'clear' && before.pendingMatches.length > 0) {
      cascades.push({ matches: before.pendingMatches.map((m) => m.cells) });
      const unique = new Set(before.pendingMatches.flatMap((m) => m.cells));
      cleared += unique.size;
    }
    if (cascades.length > 60) break;
  }
  return { board: state.board, cascades, cleared };
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
  rng: Rng = makeRng(Date.now()),
): CandyCell[] => {
  const next = board.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export interface ColorBombResult {
  board: CandyCell[];
  removed: number;
  color: GemId | null;
}

export const detonateColorBomb = (
  board: readonly CandyCell[],
  width = BOARD_WIDTH,
  pool: readonly GemId[] = DEFAULT_POOL,
  rng: Rng = makeRng(Date.now()),
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
  const choice = candidates[Math.floor(rng.nextFloat() * candidates.length) % candidates.length];
  const target = choice?.[0] ?? null;
  let removed = 0;

  const cleared = board.map((cell) => {
    if (target && cell.gem === target) {
      removed += 1;
      return null;
    }
    return cell;
  });

  const collapsed = collapseColumns(cleared, width);
  const filled = fillNulls(collapsed, width, pool, rng);
  return { board: filled, removed, color: target ?? null };
};

export const initialBoosters = Object.freeze({ shuffle: 2, colorBomb: 1 });

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

const pickPrimaryMatch = (
  matches: MatchGroup[],
  a: number,
  b: number,
): MatchGroup | undefined => {
  const candidates = matches.filter((group) => group.cells.includes(a) || group.cells.includes(b));
  if (candidates.length === 0) return undefined;
  return candidates.sort((x, y) => y.length - x.length)[0];
};

export const trySwap = (
  board: readonly CandyCell[],
  a: number,
  b: number,
  mode: SwapMode = 'strict',
): SwapResult => {
  if (!isAdjacent(a, b)) {
    return { ok: false, board: board.slice(), reason: 'not-adjacent' };
  }
  const swapped = swapCandies(board, a, b);
  const matches = findMatches(swapped);
  if (matches.length === 0 && mode === 'strict') {
    return { ok: false, board: board.slice(), reason: 'no-match' };
  }

  let createdSpecial: CreatedSpecial | undefined;
  if (matches.length > 0) {
    const primary = pickPrimaryMatch(matches, a, b);
    if (primary && primary.length >= 4) {
      const anchor = primary.cells.includes(a) ? a : primary.cells.includes(b) ? b : primary.cells[0];
      const special: Special = primary.length >= 5 ? 'color-bomb' : primary.kind === 'h' ? 'striped-h' : 'striped-v';
      const boardWithSpecial = swapped.slice();
      boardWithSpecial[anchor] = { ...boardWithSpecial[anchor], special };
      createdSpecial = { index: anchor, special, gem: boardWithSpecial[anchor].gem };
      return { ok: true, board: boardWithSpecial, matches, createdSpecial };
    }
  }

  return { ok: true, board: swapped, matches };
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
