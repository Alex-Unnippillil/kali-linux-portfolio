import { Replay } from '../../utils/replay';
import type { Board } from '../../apps/games/_2048/logic';
import { shareBlob } from '../../components/apps/Games/common/share';

type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

type ReplayEvent = { t: number; dir: Direction };

export type RecordedGame = {
  board: Board;
  rng: string;
  seed: string;
  moves: Direction[];
  events: ReplayEvent[];
};

const recorder = new Replay<Direction>();
let startState: { board: Board; rng: string; seed: string } | null = null;

export function startRecording(board: Board, rng: string, seed: string): void {
  startState = {
    board: board.map((row) => [...row]),
    rng,
    seed,
  };
  recorder.startRecording();
}

export function recordMove(dir: Direction): void {
  recorder.record(dir);
}

export function undoRecord(): void {
  recorder.rewind();
}

export function getReplayData(): RecordedGame | null {
  if (!startState) return null;
  const events = recorder.getEvents().map(({ t, data }) => ({ t, dir: data }));
  return {
    board: startState.board.map((row) => [...row]),
    rng: startState.rng,
    seed: startState.seed,
    moves: events.map((evt) => evt.dir),
    events,
  };
}

export async function downloadReplay(): Promise<void> {
  const data = getReplayData();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  await shareBlob(blob, '2048-replay.json');
}

const replay = { startRecording, recordMove, undoRecord, getReplayData, downloadReplay };

export default replay;
