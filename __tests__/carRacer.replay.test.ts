import { createGame, stepGame } from '../games/car-racer/engine';
import { createReplay, inputToMask, maskToInput, recordEvent, simulateReplay } from '../games/car-racer/replay';

describe('car racer replay', () => {
  it('replays identical states for the same seed and inputs', () => {
    const tickRate = 120;
    const replay = createReplay(9, 'default', tickRate);
    let state = createGame(replay.seed, replay.levelId);
    const throttleMask = inputToMask({ throttle: true });
    recordEvent(replay.events, 0, throttleMask, 0);
    for (let i = 0; i < 60; i += 1) {
      state = stepGame(state, maskToInput(throttleMask), 1 / tickRate);
      replay.durationTicks = state.tick;
    }
    replay.result = { score: Math.floor(state.distance) };

    const ghost = simulateReplay(replay);
    expect(Math.floor(ghost.distance)).toBe(Math.floor(state.distance));
    expect(ghost.tick).toBe(state.tick);
    expect(ghost.timeSec).toBeCloseTo(state.timeSec);
  });
});
