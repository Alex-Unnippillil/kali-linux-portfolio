import { createGame, GameState, InputFrame, stepGame } from './engine';
import { safeLocalStorage } from '../../utils/safeStorage';

export type ReplayEvent = { tick: number; mask: number };
export type CarRacerReplay = {
  version: 1;
  seed: number;
  levelId: string;
  tickRate: number;
  durationTicks: number;
  events: ReplayEvent[];
  result: { bestLapSec?: number; score?: number; laps?: number };
};

export const INPUT_BITS = {
  left: 1 << 0,
  right: 1 << 1,
  throttle: 1 << 2,
  brake: 1 << 3,
  boost: 1 << 4,
};

export function inputToMask(input: InputFrame): number {
  let mask = 0;
  if (input.left) mask |= INPUT_BITS.left;
  if (input.right) mask |= INPUT_BITS.right;
  if (input.throttle) mask |= INPUT_BITS.throttle;
  if (input.brake) mask |= INPUT_BITS.brake;
  if (input.boost) mask |= INPUT_BITS.boost;
  return mask;
}

export function maskToInput(mask: number): InputFrame {
  return {
    left: !!(mask & INPUT_BITS.left),
    right: !!(mask & INPUT_BITS.right),
    throttle: !!(mask & INPUT_BITS.throttle),
    brake: !!(mask & INPUT_BITS.brake),
    boost: !!(mask & INPUT_BITS.boost),
  };
}

export function createReplay(seed: number, levelId: string, tickRate: number): CarRacerReplay {
  return {
    version: 1,
    seed,
    levelId,
    tickRate,
    durationTicks: 0,
    events: [],
    result: {},
  };
}

export function recordEvent(events: ReplayEvent[], tick: number, mask: number, lastMask: number) {
  if (events.length === 0 || mask !== lastMask) {
    events.push({ tick, mask });
  }
}

export function playbackTick(replay: CarRacerReplay, currentTick: number, cursor: number) {
  let mask = cursor >= 0 && cursor < replay.events.length ? replay.events[cursor].mask : 0;
  let nextCursor = cursor;
  if (replay.events[nextCursor + 1] && replay.events[nextCursor + 1].tick === currentTick) {
    nextCursor += 1;
    mask = replay.events[nextCursor].mask;
  }
  return { mask, cursor: nextCursor };
}

export function simulateReplay(replay: CarRacerReplay): GameState {
  const state = createGame(replay.seed, replay.levelId);
  let cursor = -1;
  for (let tick = 0; tick < replay.durationTicks; tick += 1) {
    const { mask, cursor: nextCursor } = playbackTick(replay, tick, cursor);
    cursor = nextCursor;
    const input = maskToInput(mask);
    const dt = 1 / replay.tickRate;
    const next = stepGame(state, input, dt);
    Object.assign(state, next);
  }
  return state;
}

export function persistReplay(key: string, replay: CarRacerReplay) {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(replay));
  } catch {
    // ignore quota errors
  }
}

export function loadReplay(key: string): CarRacerReplay | null {
  if (!safeLocalStorage) return null;
  try {
    const raw = safeLocalStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CarRacerReplay;
    if (parsed && parsed.version === 1) return parsed;
  } catch {
    // ignore
  }
  return null;
}
