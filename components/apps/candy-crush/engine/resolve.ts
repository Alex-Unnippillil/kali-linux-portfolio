import type { Board, CandyKind, Color, Coord, MatchGroup, ResolutionStep } from './types';
import { cloneBoard, canOccupy } from './board';
import { detectMatches, hasAnyLegalMove } from './match';
import { applySwap } from './swap';
import { pickCreationCell, resolveCombo, specialFromMatch, triggerSpecialAt } from './specials';
import { createRng } from './rng';

const cellKey = (c: Coord) => `${c.r}:${c.c}`;

const inBounds = (board: Board, coord: Coord) =>
  coord.r >= 0 && coord.c >= 0 && coord.r < board.rows && coord.c < board.cols;

const scoreForKind = (kind: CandyKind) => {
  if (kind === 'normal') return 60;
  if (kind === 'wrapped') return 220;
  if (kind === 'colorBomb') return 300;
  return 180;
};

const applyRemoval = (board: Board, toRemove: Coord[]) => {
  let jellyCleared = 0;
  let iceCleared = 0;
  const removedColors: Color[] = [];
  const unique = new Set<string>();

  for (const coord of toRemove) {
    if (!inBounds(board, coord)) continue;
    const id = cellKey(coord);
    if (unique.has(id)) continue;
    unique.add(id);

    const cell = board.cells[coord.r][coord.c];
    if (cell.hole) continue;

    if (cell.candy) {
      if (cell.candy.color) removedColors.push(cell.candy.color);
      cell.candy = null;
    }

    if (cell.jelly > 0) {
      cell.jelly = (cell.jelly - 1) as 0 | 1 | 2;
      jellyCleared += 1;
    }

    if (cell.ice > 0) {
      cell.ice = (cell.ice - 1) as 0 | 1 | 2;
      iceCleared += 1;
    }
  }

  return { jellyCleared, iceCleared, removedColors, removedCount: unique.size };
};

const applyGravity = (board: Board) => {
  for (let c = 0; c < board.cols; c += 1) {
    const stack = [];
    for (let r = board.rows - 1; r >= 0; r -= 1) {
      const cell = board.cells[r][c];
      if (cell.hole) continue;
      if (cell.candy) stack.push(cell.candy);
      cell.candy = null;
    }
    for (let r = board.rows - 1; r >= 0; r -= 1) {
      const cell = board.cells[r][c];
      if (cell.hole || cell.ice > 0) continue;
      cell.candy = stack.shift() ?? null;
    }
  }
};

const refill = (board: Board, colors: Color[], weights: Partial<Record<Color, number>>, seed: number) => {
  const rng = createRng(seed);
  const pickColor = () => {
    const total = colors.reduce((sum, color) => sum + (weights[color] ?? 1), 0);
    let t = rng.next() * total;
    for (const color of colors) {
      t -= weights[color] ?? 1;
      if (t <= 0) return color;
    }
    return colors[colors.length - 1];
  };

  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const cell = board.cells[r][c];
      if (cell.hole || cell.ice > 0 || cell.candy) continue;
      cell.candy = { id: `cc-${seed}-${r}-${c}-${rng.nextInt(99999)}`, color: pickColor(), kind: 'normal' };
    }
  }
  return rng.state();
};

const determineSpecial = (groups: MatchGroup[], a: Coord, b: Coord) => {
  for (const group of groups) {
    const special = specialFromMatch(group);
    if (!special) continue;
    return { createAt: pickCreationCell(group, a, b), kind: special, source: group.cells };
  }
  return null;
};

export interface ResolutionResult {
  board: Board;
  queue: ResolutionStep[];
  scoreDelta: number;
  removedColors: Color[];
  jellyCleared: number;
  iceCleared: number;
  cascades: number;
}

export const resolveTurn = (
  board: Board,
  a: Coord,
  b: Coord,
  colors: Color[],
  weights: Partial<Record<Color, number>>,
  seed: number,
): ResolutionResult => {
  const next = cloneBoard(board);
  const queue: ResolutionStep[] = [{ type: 'swap', a, b }];
  let score = 0;
  let jellyCleared = 0;
  let iceCleared = 0;
  let removedColors: Color[] = [];
  let cascades = 0;

  const swapped = applySwap(next, a, b);
  next.cells = swapped.cells;

  const combo = resolveCombo(next, a, b);
  if (combo) {
    queue.push({ type: 'combo', a, b, combo: `${next.cells[a.r][a.c].candy?.kind}+${next.cells[b.r][b.c].candy?.kind}` });
    if (combo.transformColor && combo.transformKind) {
      for (let r = 0; r < next.rows; r += 1) {
        for (let c = 0; c < next.cols; c += 1) {
          const candy = next.cells[r][c].candy;
          if (candy?.color === combo.transformColor) candy.kind = combo.transformKind;
        }
      }
      const transformed = [];
      for (let r = 0; r < next.rows; r += 1) for (let c = 0; c < next.cols; c += 1) if (next.cells[r][c].candy?.kind === combo.transformKind) transformed.push(...triggerSpecialAt(next, { r, c }));
      combo.cells = transformed;
    }
    const removed = applyRemoval(next, combo.cells);
    score += removed.removedCount * 120;
    jellyCleared += removed.jellyCleared;
    iceCleared += removed.iceCleared;
    removedColors = removedColors.concat(removed.removedColors);
  }

  let currentSeed = seed;
  while (true) {
    const groups = detectMatches(next);
    if (groups.length === 0) break;
    cascades += 1;
    const special = determineSpecial(groups, a, b);
    const toRemove = new Set<string>();
    for (const group of groups) {
      queue.push({ type: 'match', cells: group.cells });
      for (const cell of group.cells) toRemove.add(cellKey(cell));
    }

    if (special) {
      queue.push({ type: 'special', at: special.createAt, special: special.kind });
      next.cells[special.createAt.r][special.createAt.c].candy = {
        id: `cc-special-${currentSeed}-${special.createAt.r}-${special.createAt.c}`,
        color: special.kind === 'colorBomb' ? null : next.cells[special.createAt.r][special.createAt.c].candy?.color ?? groups[0].color,
        kind: special.kind,
      };
      toRemove.delete(cellKey(special.createAt));
    }

    const expanded: Coord[] = [...toRemove].map((token) => {
      const [r, c] = token.split(':').map(Number);
      return { r, c };
    });
    for (const coord of expanded) {
      const candy = next.cells[coord.r]?.[coord.c]?.candy;
      if (candy && candy.kind !== 'normal') {
        for (const extra of triggerSpecialAt(next, coord)) toRemove.add(cellKey(extra));
      }
    }

    const toRemoveCoords = [...toRemove].map((token) => {
      const [r, c] = token.split(':').map(Number);
      return { r, c };
    });
    queue.push({ type: 'remove', cells: toRemoveCoords });
    const removed = applyRemoval(next, toRemoveCoords);
    removedColors = removedColors.concat(removed.removedColors);
    jellyCleared += removed.jellyCleared;
    iceCleared += removed.iceCleared;
    score += toRemoveCoords.length * 60;

    queue.push({ type: 'gravity' });
    applyGravity(next);

    queue.push({ type: 'refill' });
    currentSeed = refill(next, colors, weights, currentSeed + cascades + 17);

    if (cascades > 100) {
      // hard stop to prevent runaway loops in invalid board states
      break;
    }
  }

  if (!hasAnyLegalMove(next)) {
    // reshuffle preserving blockers
    const movable: Coord[] = [];
    const candies = [];
    for (let r = 0; r < next.rows; r += 1) {
      for (let c = 0; c < next.cols; c += 1) {
        if (!canOccupy(next, { r, c })) continue;
        movable.push({ r, c });
        if (next.cells[r][c].candy) candies.push(next.cells[r][c].candy!);
      }
    }
    const shuffleRng = createRng(currentSeed + 999);
    for (let i = candies.length - 1; i > 0; i -= 1) {
      const j = shuffleRng.nextInt(i + 1);
      const temp = candies[i];
      candies[i] = candies[j];
      candies[j] = temp;
    }
    movable.forEach((coord, index) => {
      next.cells[coord.r][coord.c].candy = candies[index] ?? null;
    });
    currentSeed = shuffleRng.state();
  }

  for (let r = 0; r < next.rows; r += 1) {
    for (let c = 0; c < next.cols; c += 1) {
      const candy = next.cells[r][c].candy;
      if (candy) score += scoreForKind(candy.kind) * 0;
    }
  }

  queue.push({ type: 'stable' });

  return { board: next, queue, scoreDelta: score, jellyCleared, iceCleared, removedColors, cascades };
};
