import { Replay } from '../../utils/replay';
import { serialize } from '../../apps/games/rng';
import type { Board } from '../../apps/games/_2048/logic';
import { shareBlob } from '../../components/apps/Games/common/share';

const recorder = new Replay<string>();
let startState: { board: Board; rng: string } | null = null;

export function startRecording(board: Board): void {
  startState = { board: board.map((row) => [...row]), rng: serialize() };
  recorder.startRecording();
}

export function recordMove(dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): void {
  recorder.record(dir);
}

export async function downloadReplay(): Promise<void> {
  if (!startState) return;
  const data = {
    board: startState.board,
    rng: startState.rng,
    events: recorder.getEvents().map(({ t, data }) => ({ t, dir: data })),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  await shareBlob(blob, '2048-replay.json');
}

const replay = { startRecording, recordMove, downloadReplay };

export default replay;
