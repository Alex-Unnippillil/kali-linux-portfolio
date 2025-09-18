import { serialize } from '../../apps/games/rng';
import type { Board } from '../../apps/games/_2048/logic';
import { shareBlob } from '../../components/apps/Games/common/share';

export type ReplayDirection = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export interface ReplayStep {
  t: number;
  dir: ReplayDirection;
  board: Board;
  rng: string;
  score: number;
  won: boolean;
  lost: boolean;
}

export interface ReplayData {
  seed: string;
  board: Board;
  rng: string;
  score: number;
  size: number;
  events: ReplayStep[];
}

let startState:
  | { board: Board; rng: string; score: number; seed: string; size: number }
  | null = null;
let events: ReplayStep[] = [];
let startTime = 0;

const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

export function startRecording(
  board: Board,
  score = 0,
  seed = '',
  size = 4,
): ReplayData | null {
  startState = { board: cloneBoard(board), rng: serialize(), score, seed, size };
  events = [];
  startTime = Date.now();
  return getReplayData();
}

export function recordMove(
  dir: ReplayDirection,
  board: Board,
  score: number,
  won: boolean,
  lost: boolean,
): ReplayData | null {
  if (!startState) return null;
  const now = Date.now();
  const rawT = now - startTime;
  const lastT = events[events.length - 1]?.t ?? -1;
  const t = rawT <= lastT ? lastT + 1 : rawT;
  const snapshot = cloneBoard(board);
  const entry: ReplayStep = {
    t,
    dir,
    board: snapshot,
    rng: serialize(),
    score,
    won,
    lost,
  };
  events = [...events, entry];
  return getReplayData();
}

export function rewindLastMove(): ReplayData | null {
  if (!events.length) return getReplayData();
  events = events.slice(0, -1);
  const lastT = events[events.length - 1]?.t ?? 0;
  startTime = Date.now() - lastT;
  return getReplayData();
}

export function getReplayData(): ReplayData | null {
  if (!startState) return null;
  return {
    seed: startState.seed,
    board: cloneBoard(startState.board),
    rng: startState.rng,
    score: startState.score,
    size: startState.size,
    events: events.map((evt) => ({
      ...evt,
      board: cloneBoard(evt.board),
    })),
  };
}

export function clearReplay(): void {
  startState = null;
  events = [];
  startTime = 0;
}

export async function downloadReplay(): Promise<void> {
  const data = getReplayData();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  await shareBlob(blob, '2048-replay.json');
}
