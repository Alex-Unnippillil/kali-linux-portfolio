import {
  initLane,
  updateCars,
  handlePads,
  PAD_POSITIONS,
  rampLane,
    carLaneDefs,
    logLaneDefs,
    TILE,
    COLLISION_TOLERANCE,
    rectsIntersect,
  } from '@components/apps/frogger';

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
    const car = rampLane(carLaneDefs[0], level, 0.3);
    expect(car.speed).toBeCloseTo(carLaneDefs[0].speed * 1.4);
    expect(car.spawnRate).toBeCloseTo(Math.max(0.3, carLaneDefs[0].spawnRate * 0.8));
    const log = rampLane(logLaneDefs[0], level, 0.5);
    expect(log.speed).toBeCloseTo(logLaneDefs[0].speed * 1.4);
    expect(log.spawnRate).toBeCloseTo(Math.max(0.5, logLaneDefs[0].spawnRate * 0.8));
  });

    test('collision tolerance allows slight overlap', () => {
      const base = initLane({ y: 0, dir: 1, speed: 0, spawnRate: 1000, length: 1, type: 'car' }, 1);
      const lane = {
        ...base,
        items: [
        {
          x: TILE - COLLISION_TOLERANCE / 2,
          width: TILE,
          height: TILE,
        },
      ],
      };
      expect(updateCars([lane], { x: 0, y: 0 }, 0).dead).toBe(false);
    });

    test('wave pattern offsets lane items', () => {
      const base = initLane(
        { y: 1, dir: 1, speed: 1, spawnRate: 100, length: 1, pattern: 'straight', easing: 'linear' },
        1,
      );
      base.items.push({ x: 0, width: TILE, height: TILE });
      const straight = updateCars([base], { x: 0, y: 0 }, 0.25).lanes[0].items[0].x;
      const waveLane = initLane(
        { y: 1, dir: 1, speed: 1, spawnRate: 100, length: 1, pattern: 'wave', easing: 'linear' },
        1,
      );
      waveLane.items.push({ x: 0, width: TILE, height: TILE });
      const wavy = updateCars([waveLane], { x: 0, y: 0 }, 0.25).lanes[0].items[0].x;
      expect(wavy).not.toBeCloseTo(straight);
    });

    test('easing affects movement speed', () => {
      const linear = initLane(
        { y: 0, dir: 1, speed: 1, spawnRate: 100, length: 1, easing: 'linear' },
        1,
      );
      linear.items.push({ x: 0, width: TILE, height: TILE });
      const xLinear = updateCars([linear], { x: 0, y: 0 }, 0.25).lanes[0].items[0].x;
      const eased = initLane(
        { y: 0, dir: 1, speed: 1, spawnRate: 100, length: 1, easing: 'easeInOutSine' },
        1,
      );
      eased.items.push({ x: 0, width: TILE, height: TILE });
      const xEased = updateCars([eased], { x: 0, y: 0 }, 0.25).lanes[0].items[0].x;
      expect(xEased).not.toBeCloseTo(xLinear);
    });

    test('bounding-box helper detects overlap', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 5, y: 5, width: 10, height: 10 };
      const c = { x: 20, y: 20, width: 5, height: 5 };
      expect(rectsIntersect(a, b)).toBe(true);
      expect(rectsIntersect(a, c)).toBe(false);
    });
  });
