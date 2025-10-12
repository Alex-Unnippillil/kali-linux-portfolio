import {
  initLane,
  updateCars,
  updateLogs,
  handlePads,
  PAD_POSITIONS,
  rampLane,
  carLaneDefs,
  logLaneDefs,
  syncFroggerHighScore,
  loadFroggerHighScore,
  FROGGER_HIGHSCORE_KEY,
} from '../components/apps/frogger';

const createMockStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
};

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

  test('frog without log support triggers water death', () => {
    const lane = initLane(logLaneDefs[0], 101);
    lane.entities = [];
    const result = updateLogs([lane], { x: 0, y: 1 }, 0.016);
    expect(result.dead).toBe(true);
  });

  test('high score sync persists only improvements', () => {
    const storage = createMockStorage();
    expect(loadFroggerHighScore(storage)).toBe(0);
    const first = syncFroggerHighScore(250, storage);
    expect(first).toBe(250);
    expect(storage.getItem(FROGGER_HIGHSCORE_KEY)).toBe('250');
    const second = syncFroggerHighScore(200, storage);
    expect(second).toBe(250);
    expect(storage.getItem(FROGGER_HIGHSCORE_KEY)).toBe('250');
    const third = syncFroggerHighScore(400, storage);
    expect(third).toBe(400);
    expect(storage.getItem(FROGGER_HIGHSCORE_KEY)).toBe('400');
  });
});
