export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 300;
export const PIPE_WIDTH = 40;

export const GRAVITY_VARIANTS = [
  { name: 'Easy', value: 0.2 },
  { name: 'Normal', value: 0.4 },
  { name: 'Hard', value: 0.6 },
] as const;

const BASE_GAP = 80;
const PRACTICE_GAP = 120;
const MIN_GAP = 60;
const BASE_PIPE_INTERVAL = 100;
const MIN_PIPE_INTERVAL = 60;
const PIPE_SPEED = 2;
const JUMP_VELOCITY = -7;
const CRASH_DURATION = 18;

export interface FlappySettings {
  gravityVariant: number;
  practiceMode: boolean;
  reducedMotion: boolean;
}

export interface FlappyPipe {
  x: number;
  baseTop: number;
  baseBottom: number;
  amplitude: number;
  phase: number;
}

export interface BirdState {
  x: number;
  y: number;
  vy: number;
}

export interface FlappyState {
  frame: number;
  seed: number;
  score: number;
  bird: BirdState;
  birdAngle: number;
  pipes: FlappyPipe[];
  pipeInterval: number;
  nextPipeFrame: number;
  gap: number;
  gravity: number;
  pipeGlowPhase: number;
  status: 'ready' | 'running' | 'crashing' | 'gameover';
  crashTimer: number;
}

export interface FlappyRunData {
  seed: number;
  flaps: number[];
  positions: number[];
  score: number;
}

export interface FlappyStepResult {
  scored?: number;
  milestone?: number;
  crash?: boolean;
  gameOver?: FlappyRunData;
}

export interface FlappyEngine {
  state: FlappyState;
  settings: FlappySettings;
  reset: (seed?: number) => void;
  start: (seed?: number) => void;
  step: () => FlappyStepResult | null;
  flap: (record?: boolean) => void;
  setReplay: (flaps: number[] | null) => void;
  applySettings: (next: Partial<FlappySettings>) => void;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function createRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function pipeExtents(
  pipe: FlappyPipe,
  frame: number,
  height: number,
  reducedMotion: boolean,
) {
  const wobble = reducedMotion ? 0 : Math.sin(frame / 18 + pipe.phase) * pipe.amplitude;
  let top = pipe.baseTop + wobble;
  let bottom = pipe.baseBottom + wobble;
  const clampOffset = Math.max(0, 20 - top);
  if (clampOffset) {
    top += clampOffset;
    bottom += clampOffset;
  }
  if (bottom > height - 20) {
    const diff = bottom - (height - 20);
    top -= diff;
    bottom -= diff;
  }
  return { top, bottom };
}

export function createFlappyEngine({
  width = GAME_WIDTH,
  height = GAME_HEIGHT,
  settings = {
    gravityVariant: 1,
    practiceMode: false,
    reducedMotion: false,
  },
}: {
  width?: number;
  height?: number;
  settings?: FlappySettings;
} = {}): FlappyEngine {
  let rand = createRandom(Date.now());
  let replayFlaps: number[] | null = null;
  let replayIndex = 0;

  const state: FlappyState = {
    frame: 0,
    seed: Date.now(),
    score: 0,
    bird: { x: 50, y: height / 2, vy: 0 },
    birdAngle: 0,
    pipes: [],
    pipeInterval: BASE_PIPE_INTERVAL,
    nextPipeFrame: BASE_PIPE_INTERVAL,
    gap: settings.practiceMode ? PRACTICE_GAP : BASE_GAP,
    gravity: GRAVITY_VARIANTS[settings.gravityVariant]?.value ?? GRAVITY_VARIANTS[1].value,
    pipeGlowPhase: 0,
    status: 'ready',
    crashTimer: 0,
  };

  let flapFrames: number[] = [];
  let positions: number[] = [];

  const addPipe = () => {
    const gap = state.gap;
    const topBase = rand() * (height - gap - 40) + 20;
    const amplitude = settings.reducedMotion ? 0 : rand() * 6 + 4;
    const phase = rand() * Math.PI * 2;
    state.pipes.push({
      x: width,
      baseTop: topBase,
      baseBottom: topBase + gap,
      amplitude,
      phase,
    });
  };

  const triggerCrash = () => {
    if (state.status === 'crashing' || state.status === 'gameover') return;
    state.status = 'crashing';
    state.crashTimer = CRASH_DURATION;
  };

  const reset = (seed = Date.now()) => {
    state.seed = seed;
    rand = createRandom(seed);
    state.bird = { x: 50, y: height / 2, vy: 0 };
    state.frame = 0;
    state.score = 0;
    state.status = 'ready';
    state.crashTimer = 0;
    state.pipeGlowPhase = 0;
    state.pipeInterval = BASE_PIPE_INTERVAL;
    state.nextPipeFrame = BASE_PIPE_INTERVAL;
    state.gap = settings.practiceMode ? PRACTICE_GAP : BASE_GAP;
    state.pipes = [];
    flapFrames = [];
    positions = [];
    replayIndex = 0;
  };

  const start = (seed = Date.now()) => {
    reset(seed);
    state.status = 'running';
    addPipe();
  };

  const flap = (record = true) => {
    state.bird.vy = JUMP_VELOCITY;
    if (record) flapFrames.push(state.frame);
  };

  const applySettings = (next: Partial<FlappySettings>) => {
    settings = { ...settings, ...next };
    const nextGravityIndex = clamp(
      Number(settings.gravityVariant ?? 1),
      0,
      GRAVITY_VARIANTS.length - 1,
    );
    settings.gravityVariant = nextGravityIndex;
    state.gravity = GRAVITY_VARIANTS[nextGravityIndex]?.value ?? state.gravity;
    state.gap = settings.practiceMode ? PRACTICE_GAP : BASE_GAP;
  };

  const setReplay = (flaps: number[] | null) => {
    replayFlaps = flaps?.length ? [...flaps] : null;
    replayIndex = 0;
  };

  const step = (): FlappyStepResult | null => {
    if (state.status === 'ready') return null;
    if (state.status === 'crashing') {
      state.bird.vy += state.gravity * 2;
      state.bird.y += state.bird.vy;
      state.birdAngle += 0.3;
      state.crashTimer -= 1;
      if (state.bird.y + 10 > height || state.crashTimer <= 0) {
        state.status = 'gameover';
        return {
          gameOver: {
            seed: state.seed,
            flaps: flapFrames.slice(),
            positions: positions.slice(),
            score: state.score,
          },
        };
      }
      return null;
    }

    if (state.status !== 'running') return null;

    state.frame += 1;
    state.pipeGlowPhase += settings.reducedMotion ? 0 : 0.05;

    if (
      replayFlaps &&
      replayIndex < replayFlaps.length &&
      state.frame === replayFlaps[replayIndex]
    ) {
      flap(false);
      replayIndex += 1;
    }

    if (state.frame >= state.nextPipeFrame) {
      state.gap = settings.practiceMode
        ? PRACTICE_GAP
        : Math.max(MIN_GAP, BASE_GAP - Math.floor(state.score / 5) * 2);
      addPipe();
      state.pipeInterval = Math.max(
        MIN_PIPE_INTERVAL,
        BASE_PIPE_INTERVAL - Math.floor(state.score / 5) * 5,
      );
      state.nextPipeFrame = state.frame + state.pipeInterval;
    }

    state.bird.vy += state.gravity;
    state.bird.y += state.bird.vy;
    positions.push(state.bird.y);

    state.birdAngle = clamp(state.bird.vy / 10, -0.5, 0.7);

    if (state.bird.y + 10 > height || state.bird.y - 10 < 0) {
      triggerCrash();
      return { crash: true };
    }

    let passed = 0;
    for (let i = state.pipes.length - 1; i >= 0; i -= 1) {
      const pipe = state.pipes[i];
      pipe.x -= PIPE_SPEED;
      const { top, bottom } = pipeExtents(
        pipe,
        state.frame,
        height,
        settings.reducedMotion,
      );
      if (
        !settings.practiceMode &&
        pipe.x < state.bird.x + 10 &&
        pipe.x + PIPE_WIDTH > state.bird.x - 10 &&
        (state.bird.y - 10 < top || state.bird.y + 10 > bottom)
      ) {
        triggerCrash();
        return { crash: true };
      }
      if (pipe.x + PIPE_WIDTH < 0) {
        passed += 1;
        state.pipes.splice(i, 1);
      }
    }

    if (passed) {
      state.score += passed;
      const milestone = state.score > 0 && state.score % 10 === 0 ? state.score : undefined;
      return { scored: passed, milestone };
    }

    return null;
  };

  return {
    state,
    settings,
    reset,
    start,
    step,
    flap,
    setReplay,
    applySettings,
  };
}
