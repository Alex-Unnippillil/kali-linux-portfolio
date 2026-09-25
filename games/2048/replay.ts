import { Replay } from '../../utils/replay';
import type { Direction, GameState } from '../../apps/games/_2048/logic';
import { shareBlob } from '../../components/apps/Games/common/share';

const recorder = new Replay<string>();
let startState: GameState | null = null;

export function startRecording(game: GameState): void {
  startState = {
    ...game,
    board: game.board.map((row) => [...row]),
  };
  recorder.startRecording();
}

export function recordMove(dir: Direction): void {
  recorder.record(dir);
}

export async function downloadReplay(): Promise<void> {
  if (!startState) return;
  const data = {
    state: {
      board: startState.board,
      rng: startState.rng,
      size: startState.size,
      score: startState.score,
      won: startState.won,
      over: startState.over,
      keepPlaying: startState.keepPlaying,
    },
    events: recorder.getEvents().map(({ t, data }) => ({ t, dir: data })),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  await shareBlob(blob, '2048-replay.json');
}

const replay = { startRecording, recordMove, downloadReplay };

export default replay;
