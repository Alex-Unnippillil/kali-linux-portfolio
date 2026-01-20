import seedrandom from 'seedrandom';

export type SimonPhase = 'idle' | 'playback' | 'input' | 'strike' | 'gameover';

export interface SimonOptions {
  mode: 'classic' | 'speed' | 'endless' | 'colorblind';
  tempoBpm: number;
  playMode: 'normal' | 'strict';
  timing: 'relaxed' | 'strict';
  seed: string;
}

export interface SimonState {
  phase: SimonPhase;
  sequence: number[];
  inputIndex: number;
  score: number;
  lastError?: 'wrong' | 'timeout';
  roundId: number;
}

export const initialSimonState: SimonState = {
  phase: 'idle',
  sequence: [],
  inputIndex: 0,
  score: 0,
  roundId: 0,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function padAt(seed: string, index: number): number {
  if (seed) {
    const rng = seedrandom(`${seed}:${index}`);
    return Math.floor(rng() * 4);
  }

  const buffer = new Uint8Array(1);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buffer);
  } else {
    buffer[0] = Math.floor(Math.random() * 256);
  }
  return buffer[0] % 4;
}

export function stepSeconds(opts: SimonOptions, level: number): number {
  const base = 60 / opts.tempoBpm;
  if (opts.mode === 'endless') return base;

  const reduction = opts.mode === 'speed' ? 0.03 : 0.015;
  const speedFactor = Math.pow(0.9, Math.floor(level / 5));
  const raw = (base - level * reduction) * speedFactor;

  return clamp(raw, 0.2, 2.0);
}

export function inputWindowMs(opts: SimonOptions, level: number): number | null {
  if (opts.timing !== 'strict') return null;

  const sec = stepSeconds(opts, level);
  const beatsAllowed = 3;
  const ms = beatsAllowed * sec * 1000;

  return clamp(ms, 900, 4500);
}

export function startGame(state: SimonState, options: SimonOptions): SimonState {
  const firstPad = padAt(options.seed, 0);
  return {
    ...initialSimonState,
    phase: 'playback',
    sequence: [firstPad],
    roundId: state.roundId + 1,
  };
}

export function playbackComplete(state: SimonState): SimonState {
  if (state.phase !== 'playback') return state;
  return { ...state, phase: 'input', inputIndex: 0, lastError: undefined };
}

export function replayAfterStrike(state: SimonState): SimonState {
  if (state.phase !== 'strike') return state;
  return {
    ...state,
    phase: 'playback',
    inputIndex: 0,
    lastError: undefined,
    roundId: state.roundId + 1,
  };
}

export function replaySequence(state: SimonState): SimonState {
  if (state.phase !== 'input') return state;
  return {
    ...state,
    phase: 'playback',
    inputIndex: 0,
    lastError: undefined,
    roundId: state.roundId + 1,
  };
}

export function handleInput(
  state: SimonState,
  pad: number,
  options: SimonOptions,
): SimonState {
  if (state.phase !== 'input') return state;

  const expected = state.sequence[state.inputIndex];
  if (expected !== pad) {
    const nextPhase = options.playMode === 'strict' ? 'gameover' : 'strike';
    return { ...state, phase: nextPhase, lastError: 'wrong' };
  }

  const nextIndex = state.inputIndex + 1;
  if (nextIndex === state.sequence.length) {
    const nextPad = padAt(options.seed, state.sequence.length);
    return {
      phase: 'playback',
      sequence: [...state.sequence, nextPad],
      inputIndex: 0,
      score: state.score + 1,
      lastError: undefined,
      roundId: state.roundId + 1,
    };
  }

  return { ...state, inputIndex: nextIndex };
}

export function handleTimeout(
  state: SimonState,
  options: SimonOptions,
): SimonState {
  if (state.phase !== 'input') return state;
  const nextPhase = options.playMode === 'strict' ? 'gameover' : 'strike';
  return { ...state, phase: nextPhase, lastError: 'timeout' };
}
