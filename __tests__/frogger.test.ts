import {
  clampDelta,
  initLane,
  updateCars,
  handlePads,
  PAD_POSITIONS,
  rampLane,
  carLaneDefs,
  logLaneDefs,
} from '../components/apps/frogger';

describe('frogger mechanics', () => {
  test('lane spawn variance via lane-local RNG', () => {
    const def = { y: 4, dir: 1, speed: 1, spawnRate: 1, length: 1 };
    let lane = initLane(def, 42);
    const intervals: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      intervals.push(Number(lane.timer.toFixed(5)));
      lane = updateCars([lane], { x: 0, y: 0 }, lane.timer).lanes[0];
    }
    expect(new Set(intervals).size).toBeGreaterThan(1);
  });

  test('safe pad logic allows only unoccupied pads', () => {
    let pads = PAD_POSITIONS.map(() => false);
    const hit = handlePads({ x: PAD_POSITIONS[0], y: 0 }, pads);
    expect(hit.padHit).toBe(true);
    expect(hit.dead).toBe(false);
    pads = hit.pads;
    const repeat = handlePads({ x: PAD_POSITIONS[0], y: 0 }, pads);
    expect(repeat.dead).toBe(true);
    const miss = handlePads({ x: 2, y: 0 }, PAD_POSITIONS.map(() => false));
    expect(miss.dead).toBe(true);
  });

  test('speed ramp scales lane speeds and spawn rates', () => {
    const level = 3; // two increments
    const car = rampLane(carLaneDefs[0], level, 0.3, 1);
    expect(car.speed).toBeCloseTo(carLaneDefs[0].speed * 1.4);
    expect(car.spawnRate).toBeCloseTo(
      Math.max(0.3, carLaneDefs[0].spawnRate * 0.8)
    );
    const log = rampLane(logLaneDefs[0], level, 0.5, 1);
    expect(log.speed).toBeCloseTo(logLaneDefs[0].speed * 1.4);
    expect(log.spawnRate).toBeCloseTo(
      Math.max(0.5, logLaneDefs[0].spawnRate * 0.8)
    );
  });

  test('difficulty multiplier adjusts lane speed', () => {
    const hard = rampLane(carLaneDefs[0], 1, 0.3, 1.2);
    expect(hard.speed).toBeCloseTo(carLaneDefs[0].speed * 1.2);
    const easy = rampLane(carLaneDefs[0], 1, 0.3, 0.8);
    expect(easy.speed).toBeCloseTo(carLaneDefs[0].speed * 0.8);
  });

  test('clamps large dt values to avoid simulation spikes', () => {
    expect(clampDelta(1.5)).toBeCloseTo(0.25);
    expect(clampDelta(-1)).toBeCloseTo(0);
    expect(clampDelta(0.1)).toBeCloseTo(0.1);
  });
});
